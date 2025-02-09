const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { auth, isTeamAdmin } = require('../middleware/auth');
const Team = require('../models/team');

console.log('Setting up team routes');

router.get('/', auth, teamController.getTeams);
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
    .populate('teamAdmins', 'name email role')
    .populate('createdBy', 'name email');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

module.exports = router; 