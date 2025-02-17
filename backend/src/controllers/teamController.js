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
          select: 'name email role _id',
          model: 'User'
        })
        .populate({
          path: 'members',
          select: 'name email role _id',
          model: 'User'
        })
        .populate({
          path: 'createdBy',
          select: 'name email _id',
          model: 'User'
        })
        .lean()
        .exec();
      
      // Ensure members and teamAdmins are always arrays
      const processedTeams = teams.map(team => ({
        ...team,
        members: team.members || [],
        teamAdmins: team.teamAdmins || []
      }));
      
      res.json(processedTeams);
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
        team.members = [...new Set([...team.members.map(id => id.toString()), ...addMembers])];
        // Add team to users' teams array
        await User.updateMany(
          { _id: { $in: addMembers } },
          { $addToSet: { teams: teamId } }
        );
      }
      if (removeMembers?.length) {
        team.members = team.members.filter(m => !removeMembers.includes(m.toString()));
        // Remove team from users' teams array
        await User.updateMany(
          { _id: { $in: removeMembers } },
          { $pull: { teams: teamId } }
        );
      }
      if (addAdmins?.length) {
        team.teamAdmins = [...new Set([...team.teamAdmins.map(id => id.toString()), ...addAdmins])];
        // Add team to admin users' teams array and update role
        await User.updateMany(
          { _id: { $in: addAdmins } },
          { 
            $addToSet: { teams: teamId },
            $set: { role: 'team_admin' }
          }
        );
      }
      if (removeAdmins?.length) {
        team.teamAdmins = team.teamAdmins.filter(a => !removeAdmins.includes(a.toString()));
        // Update removed admins' role if they're not admins of any other teams
        for (const adminId of removeAdmins) {
          const adminUser = await User.findById(adminId);
          const isAdminOfOtherTeams = await Team.exists({
            _id: { $ne: teamId },
            teamAdmins: adminId
          });
          if (!isAdminOfOtherTeams && adminUser.role === 'team_admin') {
            await User.findByIdAndUpdate(adminId, { role: 'user' });
          }
        }
      }

      await team.save();

      // Populate the team data
      const populatedTeam = await Team.findById(teamId)
        .populate('teamAdmins', 'name email role')
        .populate('members', 'name email role')
        .populate('createdBy', 'name email');

      res.json(populatedTeam);
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
  },

  async getTeam(req, res) {
    try {
      const team = await Team.findById(req.params.id)
        .populate('teamAdmins', 'name email role')
        .populate('members', 'name email role')
        .populate('createdBy', 'name email');

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check if user has access to team
      const hasAccess = ['network_admin', 'admin'].includes(req.user.role) ||
        team.members.includes(req.user._id) ||
        team.teamAdmins.includes(req.user._id);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Not authorized to view this team' });
      }

      res.json(team);
    } catch (error) {
      console.error('Error fetching team:', error);
      res.status(500).json({ error: 'Failed to fetch team' });
    }
  },

  async updateTeam(req, res) {
    try {
      const { name, description, domains } = req.body;
      const team = await Team.findById(req.params.id);

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Update fields
      if (name) team.name = name;
      if (description) team.description = description;
      if (domains) team.domains = domains;

      await team.save();

      // Populate team data
      await team
        .populate('teamAdmins', 'name email role')
        .populate('members', 'name email role')
        .populate('createdBy', 'name email');

      res.json(team);
    } catch (error) {
      console.error('Error updating team:', error);
      res.status(500).json({ error: 'Failed to update team' });
    }
  },

  async deleteTeam(req, res) {
    try {
      const team = await Team.findById(req.params.id);

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Remove team from all users' teams array
      await User.updateMany(
        { teams: team._id },
        { $pull: { teams: team._id } }
      );

      // Delete the team
      await team.remove();

      res.json({ message: 'Team deleted successfully' });
    } catch (error) {
      console.error('Error deleting team:', error);
      res.status(500).json({ error: 'Failed to delete team' });
    }
  }
};

module.exports = teamController; 