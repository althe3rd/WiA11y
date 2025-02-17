const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const teamRequestController = require('../controllers/teamRequestController');
const domainMetadataController = require('../controllers/domainMetadataController');
const { auth, isTeamAdmin, isNetworkAdmin } = require('../middleware/auth');
const Team = require('../models/team');
const Crawl = require('../models/crawl');

console.log('Setting up team routes');

// Public routes
router.get('/available', auth, teamRequestController.getAvailableTeams);

// Team request routes
router.get('/request/status', auth, teamRequestController.getRequestStatus);
router.post('/request', auth, teamRequestController.submitTeamCreation);
router.post('/:teamId/join-request', auth, teamRequestController.submitJoinRequest);
router.post('/requests/:requestId/review', auth, teamRequestController.reviewRequest);
// Add routes for fetching pending requests
router.get('/requests/pending', auth, isNetworkAdmin, teamRequestController.getPendingRequests);
router.get('/requests/pending/admin', auth, isTeamAdmin, teamRequestController.getPendingAdminRequests);

// Protected routes
router.use(auth);

// Team management routes
router.get('/', teamController.getTeams);
router.post('/', isNetworkAdmin, teamController.createTeam);
router.get('/:id', teamController.getTeam);
router.patch('/:id', isTeamAdmin, teamController.updateTeam);
router.delete('/:id', isNetworkAdmin, teamController.deleteTeam);
router.patch('/:teamId/members', isTeamAdmin, teamController.updateTeamMembers);

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

// Domain metadata routes
router.get('/:teamId/domains/:domain/metadata', auth, domainMetadataController.getDomainMetadata);
router.patch('/:teamId/domains/:domain/metadata', auth, domainMetadataController.updateDomainMetadata);
router.get('/:teamId/domains/metadata', auth, domainMetadataController.getTeamDomainMetadata);

module.exports = router; 