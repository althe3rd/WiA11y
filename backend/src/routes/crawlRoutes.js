const express = require('express');
const router = express.Router();
const crawlController = require('../controllers/crawlController');
const { auth } = require('../middleware/auth');
const Crawl = require('../models/crawl');
const Team = require('../models/team');

console.log('Setting up crawl routes');

// All crawl routes require authentication
router.use(auth);

// Get all crawls
router.get('/', async (req, res) => {
  try {
    // If network admin, get all crawls
    if (['network_admin', 'admin'].includes(req.user.role)) {
      const crawls = await Crawl.find()
        .sort({ createdAt: -1 })
        .populate('team', 'name _id')
        .populate('violations');
      return res.json(crawls);
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
    .populate('violations');
    
    res.json(crawls);
  } catch (error) {
    console.error('Error fetching crawls:', error);
    res.status(500).json({ error: 'Failed to fetch crawls' });
  }
});

// Create new crawl
router.post('/', crawlController.createCrawl);

// Cancel crawl
router.post('/:id/cancel', crawlController.cancelCrawl);

// Delete crawl
router.delete('/:id', crawlController.deleteCrawl);

module.exports = router; 