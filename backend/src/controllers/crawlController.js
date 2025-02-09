const Crawl = require('../models/crawl');
const Violation = require('../models/violation');
const crawlerService = require('../services/crawlerServiceInstance');
const Team = require('../models/team');

const crawlController = {
  async createCrawl(req, res) {
    try {
      console.log('Received crawl request:', {
        body: req.body,
        user: req.user._id,
        headers: req.headers
      });

      const { 
        url, 
        domain,
        team,
        depthLimit,
        pageLimit,
        crawlRate,
        wcagVersion,
        wcagLevel 
      } = req.body;

      // Verify user has access to the team if specified
      if (team) {
        console.log('Verifying team access for:', { team, userId: req.user._id });
        const hasAccess = await Team.exists({
          _id: team,
          $or: [
            { teamAdmins: req.user._id },
            { members: req.user._id }
          ]
        });

        console.log('Team access result:', { hasAccess });

        if (!hasAccess && !['network_admin', 'admin'].includes(req.user.role)) {
          return res.status(403).json({ error: 'Not authorized to create crawls for this team' });
        }
      }

      const crawl = new Crawl({
        url,
        domain,
        team,
        createdBy: req.user._id,
        depthLimit: Number(depthLimit),
        pageLimit: Number(pageLimit),
        crawlRate: Number(crawlRate),
        wcagVersion,
        wcagLevel,
        status: 'pending'
      });

      console.log('Created crawl object:', crawl);

      await crawl.save();
      console.log('Crawl saved successfully');

      // Start the crawl process
      try {
        console.log('Starting crawl process...');
        await crawlerService.startCrawl(crawl._id);
        console.log('Crawl process started successfully');
      } catch (crawlError) {
        console.error('Failed to start crawl:', crawlError);
        // Update the crawl status to failed
        crawl.status = 'failed';
        await crawl.save();
      }

      res.status(201).json(crawl);
    } catch (error) {
      console.error('Create crawl error:', error);
      res.status(400).json({ error: error.message });
    }
  },
  async getCrawls(req, res) {
    try {
      let query = {};
      
      // If not network admin or admin, filter crawls
      if (!['network_admin', 'admin'].includes(req.user.role)) {
        // Get teams user is part of
        const teams = await Team.find({
          $or: [
            { teamAdmins: req.user._id },
            { members: req.user._id }
          ]
        }).select('_id');
        
        const teamIds = teams.map(team => team._id);
        
        query = {
          $or: [
            { team: { $in: teamIds } },
            { createdBy: req.user._id }
          ]
        };
      }

      const crawls = await Crawl.find(query)
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name email')
        .populate('team', 'name');

      res.json(crawls);
    } catch (error) {
      console.error('Get crawls error:', error);
      res.status(500).json({ error: 'Failed to fetch crawls' });
    }
  },
  async cancelCrawl(req, res) {
    try {
      const crawl = await Crawl.findById(req.params.id);
      
      if (!crawl) {
        return res.status(404).json({ error: 'Crawl not found' });
      }

      // Check authorization
      if (!['network_admin', 'admin'].includes(req.user.role) && 
          crawl.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized to cancel this crawl' });
      }

      // Only try to cancel if the crawl is in progress or pending
      if (['in_progress', 'pending'].includes(crawl.status)) {
        // Cancel the crawl in the crawler service
        await crawlerService.cancelCrawl(crawl._id);
        
        // Update the crawl status
        crawl.status = 'cancelled';
        crawl.completedAt = new Date();
        await crawl.save();
      } else {
        console.log(`Crawl ${crawl._id} is already in ${crawl.status} state`);
      }
      
      res.json(crawl);
    } catch (error) {
      console.error('Cancel crawl error:', error);
      res.status(500).json({ error: 'Failed to cancel crawl' });
    }
  },
  async deleteCrawl(req, res) {
    try {
      const crawl = await Crawl.findById(req.params.id);
      
      if (!crawl) {
        return res.status(404).json({ error: 'Crawl not found' });
      }

      // Check authorization
      if (!['network_admin', 'admin'].includes(req.user.role) && 
          crawl.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized to delete this crawl' });
      }

      await Crawl.deleteOne({ _id: crawl._id });
      
      // Also delete any associated violations
      await Violation.deleteMany({ crawlId: crawl._id });

      res.json({ message: 'Crawl deleted successfully' });
    } catch (error) {
      console.error('Delete crawl error:', error);
      res.status(500).json({ error: 'Failed to delete crawl' });
    }
  }
};

module.exports = crawlController; 