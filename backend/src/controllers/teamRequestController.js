const TeamRequest = require('../models/TeamRequest');
const Team = require('../models/team');
const User = require('../models/user');
const emailService = require('../services/emailService');

const teamRequestController = {
  // Get available teams for joining
  async getAvailableTeams(req, res) {
    try {
      const teams = await Team.find({}, 'name description');
      res.json(teams);
    } catch (error) {
      console.error('Error fetching available teams:', error);
      res.status(500).json({ error: 'Failed to fetch available teams' });
    }
  },

  // Submit a request to create a new team
  async submitTeamCreation(req, res) {
    try {
      const { name, description } = req.body;
      
      // Check if team name already exists
      const existingTeam = await Team.findOne({ name });
      if (existingTeam) {
        return res.status(400).json({ error: 'Team name already exists' });
      }

      // Create team request
      const request = await TeamRequest.create({
        type: 'create',
        user: req.user._id,
        teamName: name,
        teamDescription: description
      });

      // Find network admin to notify
      const networkAdmin = await User.findOne({ role: 'network_admin' });
      if (networkAdmin) {
        await emailService.sendEmail({
          to: networkAdmin.email,
          subject: 'New Team Creation Request',
          html: `
            <h1>New Team Creation Request</h1>
            <p>A new team creation request has been submitted:</p>
            <ul>
              <li>Team Name: ${name}</li>
              <li>Requested by: ${req.user.name} (${req.user.email})</li>
              <li>Description: ${description}</li>
            </ul>
            <p>Please review this request in the admin dashboard.</p>
          `
        });
      }

      res.json({ message: 'Team creation request submitted successfully' });
    } catch (error) {
      console.error('Error submitting team creation request:', error);
      res.status(500).json({ error: 'Failed to submit team creation request' });
    }
  },

  // Submit a request to join an existing team
  async submitJoinRequest(req, res) {
    try {
      const teamId = req.params.teamId;
      
      // Check if team exists
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check if user already has a pending request
      const existingRequest = await TeamRequest.findOne({
        user: req.user._id,
        team: teamId,
        status: 'pending'
      });
      if (existingRequest) {
        return res.status(400).json({ error: 'You already have a pending request for this team' });
      }

      // Create join request
      const request = await TeamRequest.create({
        type: 'join',
        user: req.user._id,
        team: teamId
      });

      // Find team admins to notify
      const teamAdmins = await User.find({
        teams: teamId,
        role: 'team_admin'
      });

      // Send email to all team admins
      for (const admin of teamAdmins) {
        await emailService.sendEmail({
          to: admin.email,
          subject: 'New Team Join Request',
          html: `
            <h1>New Team Join Request</h1>
            <p>A new request to join ${team.name} has been submitted:</p>
            <ul>
              <li>Requested by: ${req.user.name} (${req.user.email})</li>
            </ul>
            <p>Please review this request in the team management dashboard.</p>
          `
        });
      }

      res.json({ message: 'Join request submitted successfully' });
    } catch (error) {
      console.error('Error submitting join request:', error);
      res.status(500).json({ error: 'Failed to submit join request' });
    }
  },

  // Review a team request (approve/reject)
  async reviewRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { status, notes } = req.body;

      const request = await TeamRequest.findById(requestId)
        .populate('user')
        .populate('team');

      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }

      // Verify permissions
      if (request.type === 'join') {
        const isTeamAdmin = request.team.teamAdmins.includes(req.user._id);
        const isNetworkAdmin = req.user.role === 'network_admin';
        if (!isTeamAdmin && !isNetworkAdmin) {
          return res.status(403).json({ error: 'Not authorized to review this request' });
        }
      } else if (request.type === 'create') {
        if (req.user.role !== 'network_admin') {
          return res.status(403).json({ error: 'Only network admins can review team creation requests' });
        }
      }

      request.status = status;
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      request.reviewNotes = notes;

      // If request is approved, update team memberships
      if (status === 'approved') {
        if (request.type === 'create') {
          // Create new team and add requester as admin
          const newTeam = new Team({
            name: request.teamName,
            description: request.teamDescription,
            teamAdmins: [request.user._id],
            members: [],
            createdBy: request.user._id
          });
          await newTeam.save();

          // Update user's teams and role
          await User.findByIdAndUpdate(request.user._id, {
            $addToSet: { teams: newTeam._id },
            role: 'team_admin'
          });

          request.team = newTeam._id;
        } else if (request.type === 'join') {
          // Add user to team members
          await Team.findByIdAndUpdate(request.team._id, {
            $addToSet: { members: request.user._id }
          });

          // Add team to user's teams
          await User.findByIdAndUpdate(request.user._id, {
            $addToSet: { teams: request.team._id }
          });
        }
      }

      await request.save();

      // Return populated request data
      const populatedRequest = await TeamRequest.findById(requestId)
        .populate('user', 'name email')
        .populate('team', 'name description')
        .populate('reviewedBy', 'name email');

      res.json(populatedRequest);
    } catch (error) {
      console.error('Error reviewing request:', error);
      res.status(500).json({ error: 'Failed to review request' });
    }
  },

  async getRequestStatus(req, res) {
    try {
      const pendingRequest = await TeamRequest.findOne({
        user: req.user._id,
        status: 'pending'
      });

      res.json({
        hasPendingRequest: !!pendingRequest
      });
    } catch (error) {
      console.error('Error checking request status:', error);
      res.status(500).json({ error: 'Failed to check request status' });
    }
  },

  // Get pending requests for network admin
  async getPendingRequests(req, res) {
    try {
      const requests = await TeamRequest.find({ status: 'pending' })
        .populate('user', 'name email')
        .populate('team', 'name description')
        .sort('-createdAt');

      res.json(requests.map(request => {
        const baseData = {
          _id: request._id,
          type: request.type,
          status: request.status,
          createdAt: request.createdAt,
          requester: {
            name: request.user?.name || 'Unknown User',
            email: request.user?.email || 'No email'
          }
        };

        if (request.type === 'create') {
          return {
            ...baseData,
            teamName: request.teamName || 'Unnamed Team',
            description: request.teamDescription || 'No description'
          };
        } else {
          return {
            ...baseData,
            teamName: request.team?.name || 'Unnamed Team',
            description: request.team?.description || 'No description',
            team: {
              _id: request.team?._id,
              name: request.team?.name || 'Unnamed Team',
              description: request.team?.description || 'No description'
            }
          };
        }
      }));
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      res.status(500).json({ error: 'Failed to fetch pending requests' });
    }
  },

  // Get pending requests for team admin
  async getPendingAdminRequests(req, res) {
    try {
      // Get teams where user is admin
      const adminTeams = await Team.find({ teamAdmins: req.user._id });
      const teamIds = adminTeams.map(team => team._id);

      // Find join requests for these teams
      const requests = await TeamRequest.find({
        type: 'join',
        team: { $in: teamIds },
        status: 'pending'
      })
        .populate('user', 'name email')
        .populate('team', 'name description')
        .sort('-createdAt');

      res.json(requests.map(request => ({
        _id: request._id,
        type: request.type,
        status: request.status,
        createdAt: request.createdAt,
        teamName: request.team?.name || 'Unnamed Team',
        description: request.team?.description || 'No description',
        requester: {
          name: request.user?.name || 'Unknown User',
          email: request.user?.email || 'No email'
        },
        team: {
          _id: request.team?._id,
          name: request.team?.name || 'Unnamed Team',
          description: request.team?.description || 'No description'
        }
      })));
    } catch (error) {
      console.error('Error fetching pending admin requests:', error);
      res.status(500).json({ error: 'Failed to fetch pending requests' });
    }
  }
};

module.exports = teamRequestController; 