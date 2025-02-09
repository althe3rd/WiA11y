const Team = require('../models/team');
const User = require('../models/user');
const Crawl = require('../models/crawl');

const teamController = {
  async getTeams(req, res) {
    try {
      // If network admin or admin, get all teams, otherwise only get teams user is part of
      const query = ['network_admin', 'admin'].includes(req.user.role)
        ? {} 
        : {
            $or: [
              { teamAdmins: req.user._id },
              { members: req.user._id }
            ]
          };
      
      const teams = await Team.find(query)
        .populate({
          path: 'teamAdmins',
          select: 'name email role',
          model: 'User'
        })
        .populate({
          path: 'members',
          select: 'name email role',
          model: 'User'
        })
        .populate({
          path: 'createdBy',
          select: 'name email',
          model: 'User'
        });
      
      res.json(teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  },

  async createTeam(req, res) {
    try {
      const { name, description } = req.body;
      
      const team = new Team({
        name,
        description,
        teamAdmins: [req.user._id],
        members: [],
        createdBy: req.user._id
      });
      
      await team.save();
      
      // Add team to user's teams
      await User.findByIdAndUpdate(req.user._id, {
        $push: { teams: team._id }
      });
      
      res.status(201).json(team);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async getTeamCrawls(req, res) {
    try {
      const { teamId } = req.params;
      const crawls = await Crawl.find({ team: teamId })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name');
      
      res.json(crawls);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async updateTeamMembers(req, res) {
    try {
      const { teamId } = req.params;
      const { addAdmins, removeAdmins, addMembers, removeMembers } = req.body;
      const team = await Team.findById(teamId);

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check if user has permission to modify team
      const isTeamAdmin = team.teamAdmins.includes(req.user._id);
      const isSystemAdmin = ['network_admin', 'admin'].includes(req.user.role);
      if (!isTeamAdmin && !isSystemAdmin) {
        return res.status(403).json({ error: 'Not authorized to modify team' });
      }

      // Prevent removing the team creator from admins
      if (removeAdmins?.includes(team.createdBy.toString())) {
        return res.status(400).json({ error: 'Cannot remove team creator from admins' });
      }

      // Update team members and admins
      if (addMembers?.length) {
        team.members.push(...addMembers);
      }
      if (removeMembers?.length) {
        team.members = team.members.filter(m => !removeMembers.includes(m.toString()));
      }
      if (addAdmins?.length) {
        team.teamAdmins.push(...addAdmins);
      }
      if (removeAdmins?.length) {
        team.teamAdmins = team.teamAdmins.filter(a => !removeAdmins.includes(a.toString()));
      }

      await team.save();

      // Populate the team data
      await team
        .populate({
          path: 'teamAdmins',
          select: 'name email role',
          model: 'User'
        })
        .populate({
          path: 'members',
          select: 'name email role',
          model: 'User'
        })
        .populate({
          path: 'createdBy',
          select: 'name email',
          model: 'User'
        });

      res.json(team);
    } catch (error) {
      console.error('Error updating team members:', error);
      res.status(500).json({ error: 'Failed to update team members' });
    }
  },

  async getTeamMembers(req, res) {
    try {
      const { teamId } = req.params;
      const team = await Team.findById(teamId)
        .populate('teamAdmins', 'name email')
        .populate('members', 'name email');

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      res.json({
        teamAdmins: team.teamAdmins,
        members: team.members
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch team members' });
    }
  },

  async addMember(req, res) {
    try {
      const { teamId, userId } = req.params;
      
      // Check if user is authorized to modify this team
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }
      
      const isTeamAdmin = team.teamAdmins.includes(req.user._id);
      if (req.user.role !== 'network_admin' && !isTeamAdmin) {
        return res.status(403).json({ error: 'Not authorized to modify this team' });
      }

      const updatedTeam = await Team.findByIdAndUpdate(
        teamId,
        { $addToSet: { members: userId } },
        { new: true }
      ).populate('members teamAdmins');

      res.json(updatedTeam);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add member' });
    }
  }
};

module.exports = teamController; 