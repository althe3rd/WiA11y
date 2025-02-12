const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Queue = require('../models/queue');
const Crawl = require('../models/crawl');
const Team = require('../models/team');

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

    // Get all crawls referenced in queue
    const crawls = await Crawl.find({
      _id: { $in: queueItems.map(item => item.crawlId) }
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
    const queueData = queueItems.map(item => {
      const crawl = crawls.find(c => c._id.toString() === item.crawlId.toString());
      if (!crawl) {
        console.log('Warning: No crawl found for queue item:', item);
        return null;
      }
      const isAccessible = ['network_admin', 'admin'].includes(req.user.role) ||
        userTeamIds.includes(crawl.team._id.toString());

      return {
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

    console.log('Sending queue data:', queueData);
    res.json(queueData);
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ error: 'Failed to fetch queue data' });
  }
});

module.exports = router; 