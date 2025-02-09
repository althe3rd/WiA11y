const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { auth, isTeamAdmin } = require('../middleware/auth');
const Team = require('../models/team');
const Crawl = require('../models/crawl');

console.log('Setting up team routes');

router.get('/', auth, async (req, res) => {
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
      .populate('members', 'name email role')
      .populate('teamAdmins', 'name email role')
      .populate('createdBy', 'name email');

    console.log('Teams for user:', {
      userId: req.user._id,
      userRole: req.user.role,
      teams: teams.map(t => ({
        name: t.name,
        members: t.members.map(m => ({
          id: m._id.toString(),
          name: m.name,
          email: m.email
        })),
        admins: t.teamAdmins.map(a => ({
          id: a._id.toString(),
          name: a.name,
          email: a.email
        }))
      }))
    });

    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get all crawls for a team
router.get('/:teamId/crawls', auth, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Verify user has access to this team
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check if user has access to team
    const hasAccess = ['network_admin', 'admin'].includes(req.user.role) ||
      team.members.includes(req.user._id) ||
      team.teamAdmins.includes(req.user._id);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to view team crawls' });
    }
    
    // Fetch all crawls for this team
    const crawls = await Crawl.find({ team: teamId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'violations',
        select: 'id impact description'
      });
    
    res.json(crawls);
  } catch (error) {
    console.error('Error fetching team crawls:', error);
    res.status(500).json({ error: 'Failed to fetch team crawls' });
  }
});

router.post('/', auth, teamController.createTeam);
router.get('/:teamId/members', auth, teamController.getTeamMembers);
router.patch('/:teamId/members', auth, isTeamAdmin, teamController.updateTeamMembers);

// Get teams managed by the user
router.get('/managed', auth, async (req, res) => {
  try {
    const teams = await Team.find({
      $or: [
        { teamAdmins: req.user._id },
        // Include all teams for network admins
        ...(req.user.role === 'network_admin' ? [{}] : [])
      ]
    })
    .populate('members', 'name email role')
    .populate('teamAdmins', 'name email')
    .populate('createdBy', 'name email');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

module.exports = router; 