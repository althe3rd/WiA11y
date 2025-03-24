const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Queue = require('../models/queue');
const Crawl = require('../models/crawl');
const Team = require('../models/team');
const queueService = require('../services/queueService');
const { isNetworkAdmin } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching queue data...');
    // Get all queue items with their associated crawls
    const queueItems = await Queue.find({
      status: { $in: ['queued', 'processing'] }
    })
    .sort({ position: 1 })
    .lean();

    console.log('Found queue items:', queueItems);

    // Get crawl IDs from queue items
    const queueCrawlIds = queueItems.map(item => item.crawlId);
    
    // Find any active crawls that might not be in queue items
    const activeCrawls = await Crawl.find({ 
      status: 'in_progress',
      _id: { $nin: queueCrawlIds }  // Exclude ones already in the queue
    }).lean();
    
    console.log('Found additional active crawls not in queue:', activeCrawls.length);
    
    // Get all crawls referenced in queue
    const crawls = await Crawl.find({
      _id: { $in: [...queueCrawlIds, ...activeCrawls.map(c => c._id)] }
    })
    .populate('team', 'name')
    .populate('createdBy', 'name')
    .lean();

    console.log('Found associated crawls:', crawls);

    // If user is not network_admin, get their accessible teams
    let userTeamIds = [];
    if (!['network_admin', 'admin'].includes(req.user.role)) {
      const userTeams = await Team.find({
        $or: [
          { members: req.user._id },
          { teamAdmins: req.user._id }
        ]
      });
      userTeamIds = userTeams.map(team => team._id.toString());
      console.log('User accessible team IDs:', userTeamIds);
    }

    // Combine queue items with crawl data and anonymize if needed
    let queueData = queueItems.map(item => {
      const crawl = crawls.find(c => c._id.toString() === item.crawlId.toString());
      if (!crawl) {
        console.log('Warning: No crawl found for queue item:', item);
        return null;
      }
      const isAccessible = ['network_admin', 'admin'].includes(req.user.role) ||
        userTeamIds.includes(crawl.team._id.toString());

      return {
        _id: crawl._id,
        crawlId: item.crawlId,
        position: item.position,
        status: item.status,
        createdAt: item.createdAt,
        domain: isAccessible ? crawl.domain : 'Private Site',
        team: isAccessible ? crawl.team.name : 'Private Team',
        createdBy: isAccessible ? crawl.createdBy.name : 'Private User',
        wcagVersion: crawl.wcagVersion,
        wcagLevel: crawl.wcagLevel,
        depthLimit: crawl.depthLimit,
        pageLimit: crawl.pageLimit,
        crawlRate: crawl.crawlRate,
        progress: crawl.progress || 0,
        pagesScanned: crawl.pagesScanned || 0,
        isAccessible
      };
    }).filter(Boolean);
    
    // Add active crawls that are not in queue items
    const activeCrawlData = activeCrawls.map(crawl => {
      const isAccessible = ['network_admin', 'admin'].includes(req.user.role) ||
        (crawl.team && userTeamIds.includes(crawl.team._id.toString()));
        
      return {
        _id: crawl._id,
        crawlId: crawl._id,
        status: 'processing',  // Mark as processing
        createdAt: crawl.createdAt,
        domain: isAccessible ? crawl.domain : 'Private Site',
        team: isAccessible ? (crawl.team ? crawl.team.name : 'No Team') : 'Private Team',
        createdBy: isAccessible ? (crawl.createdBy ? crawl.createdBy.name : 'Unknown') : 'Private User',
        wcagVersion: crawl.wcagVersion,
        wcagLevel: crawl.wcagLevel,
        depthLimit: crawl.depthLimit,
        pageLimit: crawl.pageLimit,
        crawlRate: crawl.crawlRate,
        progress: crawl.progress || 0,
        pagesScanned: crawl.pagesScanned || 0,
        isAccessible
      };
    });
    
    // Combine the two lists
    queueData = [...queueData, ...activeCrawlData];

    console.log('Sending queue data:', queueData);
    res.json(queueData);
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ error: 'Failed to fetch queue data' });
  }
});

// Get the queue status including active crawlers
router.get('/status', auth, async (req, res) => {
  try {
    const queueItems = await queueService.getQueueItems();
    const maxCrawlers = await queueService.getMaxCrawlers();
    
    // Get active crawls from database to ensure accuracy
    const activeCrawlsFromDb = await Crawl.countDocuments({ status: 'in_progress' });
    const activeCrawlsFromService = queueService.getActiveCrawls();
    
    console.log('Queue status request - Active crawls from DB:', activeCrawlsFromDb);
    console.log('Queue status request - Active crawls from service:', activeCrawlsFromService);
    
    // Use the maximum between the two sources to avoid missing any active crawls
    const activeCrawlsCount = Math.max(activeCrawlsFromDb, activeCrawlsFromService.length);
    
    res.json({
      activeCrawls: activeCrawlsCount,
      queuedCount: queueItems.length,
      maxCrawlers: maxCrawlers,
      availableSlots: Math.max(0, maxCrawlers - activeCrawlsCount)
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

// Get the position of a crawl in the queue
router.get('/:crawlId', auth, async (req, res) => {
  try {
    const position = await queueService.getQueuePosition(req.params.crawlId);
    res.json({ position });
  } catch (error) {
    console.error('Error getting queue position:', error);
    res.status(500).json({ error: 'Failed to get queue position' });
  }
});

// Clean up stuck crawls - restricted to network admins
router.post('/clear-stuck', auth, isNetworkAdmin, async (req, res) => {
  try {
    const result = await queueService.clearStuckCrawls();
    res.json({
      message: 'Queue cleared successfully',
      details: result
    });
  } catch (error) {
    console.error('Error clearing stuck crawls:', error);
    res.status(500).json({ error: 'Failed to clear stuck crawls' });
  }
});

// Clear stuck crawls in the system
router.post('/clear-stuck', isNetworkAdmin, async (req, res) => {
  try {
    console.log('Clearing stuck crawls...');
    
    // Find stuck crawls - crawls that are in progress but have a lastActivity timestamp older than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const stuckCrawls = await Crawl.find({
      status: 'in_progress',
      updatedAt: { $lt: tenMinutesAgo }
    });
    
    console.log(`Found ${stuckCrawls.length} stuck crawls`);
    
    // Reset stuck crawls
    for (const crawl of stuckCrawls) {
      await Crawl.findByIdAndUpdate(crawl._id, {
        status: 'failed',
        completedAt: new Date()
      });
    }
    
    // Find stuck queue items
    const stuckItems = await Queue.find({
      status: 'processing',
      updatedAt: { $lt: tenMinutesAgo }
    });
    
    console.log(`Found ${stuckItems.length} stuck queue items`);
    
    // Reset stuck queue items
    for (const item of stuckItems) {
      await Queue.findByIdAndUpdate(item._id, {
        status: 'failed'
      });
    }
    
    // Find other processing items that might not be stuck by time but should be cleared
    const processingItems = await Queue.find({
      status: 'processing'
    });
    
    console.log(`Found ${processingItems.length} total processing items`);
    
    // Reset the queue service's active crawls tracking
    queueService.resetActiveCrawls();
    
    res.json({
      success: true,
      details: {
        stuckCrawls: stuckCrawls.length,
        stuckQueueItems: stuckItems.length,
        processingItems: processingItems.length
      }
    });
  } catch (error) {
    console.error('Error clearing stuck crawls:', error);
    res.status(500).json({ error: 'Failed to clear stuck crawls' });
  }
});

// Reset active crawls - emergency endpoint for when counts get misaligned
router.post('/reset-active-crawls', isNetworkAdmin, async (req, res) => {
  try {
    console.log('Resetting active crawls count...');
    
    // First check what's really running
    const inProgressCrawls = await Crawl.find({ status: 'in_progress' });
    console.log(`Found ${inProgressCrawls.length} crawls with in_progress status`);
    
    // Option to force change status of all in-progress crawls to failed
    const forceReset = req.query.force === 'true';
    
    if (forceReset) {
      console.log('Forcing reset of all in-progress crawls...');
      
      // Mark all in-progress crawls as failed
      await Crawl.updateMany(
        { status: 'in_progress' },
        { status: 'failed', completedAt: new Date() }
      );
      
      // Mark all processing queue items as failed
      await Queue.updateMany(
        { status: 'processing' },
        { status: 'failed' }
      );
    }
    
    // Reset the queue service's active crawls tracking
    const beforeReset = queueService.getActiveCrawls();
    queueService.resetActiveCrawls();
    
    res.json({
      success: true,
      details: {
        crawlsInProgressBefore: inProgressCrawls.length,
        activeCrawlsBeforeReset: beforeReset.length,
        activeCrawlsAfterReset: queueService.getActiveCrawls().length,
        forceReset
      }
    });
  } catch (error) {
    console.error('Error resetting active crawls:', error);
    res.status(500).json({ error: 'Failed to reset active crawls' });
  }
});

module.exports = router; 