const express = require('express');
const router = express.Router();
const crawlController = require('../controllers/crawlController');
const { auth } = require('../middleware/auth');
const Crawl = require('../models/crawl');
const Team = require('../models/team');
const Violation = require('../models/violation');

console.log('Setting up crawl routes');

// All crawl routes require authentication
router.use(auth);

// Get queue status - must be before parameter routes
router.get('/status', crawlController.getQueueStatus);

// Get all crawls
router.get('/', async (req, res) => {
  try {
    // If network admin, get all crawls
    if (['network_admin', 'admin'].includes(req.user.role)) {
      const crawls = await Crawl.find()
        .sort({ createdAt: -1 })
        .populate('team', 'name _id')
        .lean();

      // Get violation counts for each crawl
      const crawlsWithViolations = await Promise.all(crawls.map(async (crawl) => {
        const violationCounts = await Violation.aggregate([
          { $match: { crawlId: crawl._id } },
          { $group: {
            _id: '$impact',
            count: { $sum: 1 }
          }}
        ]);
        
        crawl.violationsByImpact = {
          critical: 0,
          serious: 0,
          moderate: 0,
          minor: 0
        };
        
        violationCounts.forEach(count => {
          if (count._id) {
            crawl.violationsByImpact[count._id] = count.count;
          }
        });
        
        return crawl;
      }));

      return res.json(crawlsWithViolations);
    }
    
    // Otherwise get crawls for teams user is member of
    const userTeams = await Team.find({
      $or: [
        { members: req.user._id },
        { teamAdmins: req.user._id }
      ]
    });
    
    const teamIds = userTeams.map(team => team._id);
    
    const crawls = await Crawl.find({
      team: { $in: teamIds }
    })
    .sort({ createdAt: -1 })
    .populate('team', 'name _id')
    .lean();

    // Get violation counts for each crawl
    const crawlsWithViolations = await Promise.all(crawls.map(async (crawl) => {
      const violationCounts = await Violation.aggregate([
        { $match: { crawlId: crawl._id } },
        { $group: {
          _id: '$impact',
          count: { $sum: 1 }
        }}
      ]);
      
      crawl.violationsByImpact = {
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0
      };
      
      violationCounts.forEach(count => {
        if (count._id) {
          crawl.violationsByImpact[count._id] = count.count;
        }
      });
      
      return crawl;
    }));
    
    res.json(crawlsWithViolations);
  } catch (error) {
    console.error('Error fetching crawls:', error);
    res.status(500).json({ error: 'Failed to fetch crawls' });
  }
});

// Get single crawl
router.get('/:id', async (req, res) => {
  try {
    const crawl = await Crawl.findById(req.params.id)
      .populate('team', 'name _id')
      .lean();
    
    if (!crawl) {
      return res.status(404).json({ error: 'Crawl not found' });
    }
    
    // Check if user has access to this crawl
    let hasAccess = ['network_admin', 'admin'].includes(req.user.role);
    
    // If not admin, check if user created the crawl or is part of the team
    if (!hasAccess) {
      // Check if user created this crawl
      if (crawl.createdBy && crawl.createdBy.toString() === req.user._id.toString()) {
        hasAccess = true;
      } 
      // Check if user is part of the team
      else if (crawl.team) {
        const team = await Team.findById(crawl.team._id);
        if (team && (
          team.members.includes(req.user._id) || 
          team.teamAdmins.includes(req.user._id)
        )) {
          hasAccess = true;
        }
      }
    }
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to view this scan' });
    }
    
    // Fetch violations separately
    const violations = await Violation.find({ crawlId: crawl._id })
      .select('-crawlId -createdAt -updatedAt -__v')
      .lean();
    
    // Add violations to crawl response
    crawl.violations = violations;

    // Update violation counts
    const violationCounts = await Violation.aggregate([
      { $match: { crawlId: crawl._id } },
      { $group: {
        _id: '$impact',
        count: { $sum: 1 }
      }}
    ]);

    // Reset impact counts
    crawl.violationsByImpact = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0
    };

    // Update counts from actual violations
    violationCounts.forEach(count => {
      if (count._id) {
        crawl.violationsByImpact[count._id] = count.count;
      }
    });
    
    res.json(crawl);
  } catch (error) {
    console.error('Error fetching crawl:', error);
    res.status(500).json({ error: 'Failed to fetch crawl' });
  }
});

// Create new crawl
router.post('/', crawlController.createCrawl);

// Cancel crawl
router.post('/:id/cancel', crawlController.cancelCrawl);

// Delete crawl
router.delete('/:id', crawlController.deleteCrawl);

// Get crawl progress
router.get('/:id/progress', async (req, res) => {
  try {
    const crawl = await Crawl.findById(req.params.id);
    if (!crawl) {
      return res.status(404).json({ message: 'Crawl not found' });
    }
    
    res.json({
      progress: crawl.progress,
      currentUrl: crawl.currentUrl,
      status: crawl.status
    });
  } catch (error) {
    console.error('Error fetching crawl progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 