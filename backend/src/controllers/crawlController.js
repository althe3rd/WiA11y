const Crawl = require('../models/crawl');
const Violation = require('../models/violation');
const crawlerService = require('../services/crawlerServiceInstance');
const Team = require('../models/team');
const queueService = require('../services/queueService');

// Add a helper function to normalize domains
function normalizeDomain(url) {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = urlObj.hostname.toLowerCase().replace(/^www\./i, '');
    const path = urlObj.pathname.replace(/\/$/, '');
    return path ? `${hostname}${path}` : hostname;
  } catch (error) {
    // If URL parsing fails, treat the input as a hostname
    return url.toLowerCase().replace(/^www\./i, '');
  }
}

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
        title,
        team,
        depthLimit,
        pageLimit,
        crawlRate,
        wcagVersion,
        wcagLevel,
        isScheduled,
        scheduleFrequency
      } = req.body;

      // Use the full URL for domain normalization to preserve path
      const normalizedDomain = normalizeDomain(url || domain);

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
        url: url || domain, // Use the full URL to preserve the path
        domain: normalizedDomain,
        title: title || null, // Add title field
        team,
        createdBy: req.user._id,
        depthLimit: Number(depthLimit),
        pageLimit: Number(pageLimit),
        crawlRate: Number(crawlRate),
        wcagVersion,
        wcagLevel,
        status: 'pending',
        isScheduled: isScheduled === true,
        scheduleFrequency: isScheduled ? scheduleFrequency : null
      });

      console.log('Created crawl object:', crawl);

      await crawl.save();
      console.log('Crawl saved successfully');

      // Add to queue
      await queueService.addToQueue(crawl._id);

      // Log information about scheduling if enabled
      if (crawl.isScheduled) {
        console.log(`Crawl scheduled for ${crawl.scheduleFrequency} recurring runs. Next run: ${crawl.nextScheduledRun}`);
      }

      res.status(201).json(crawl);
    } catch (error) {
      console.error('Create crawl error:', error);
      res.status(500).json({ error: 'Failed to create crawl' });
    }
  },
  async getCrawls(req, res) {
    try {
      const query = {};
      
      if (req.query.domain) {
        // Normalize the domain in the search query
        query.domain = normalizeDomain(req.query.domain);
      }
      
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
        
        query.$or = [
          { team: { $in: teamIds } },
          { createdBy: req.user._id }
        ];
      }

      const crawls = await Crawl.find(query)
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name email')
        .populate('team', 'name')
        .populate('violations')
        .lean();

      // For each crawl, get the violation counts
      const crawlsWithViolations = await Promise.all(crawls.map(async (crawl) => {
        const violationCounts = await Violation.aggregate([
          { $match: { crawlId: crawl._id } },
          { $group: {
            _id: '$impact',
            count: { $sum: 1 }
          }}
        ]);
        
        // Update violationsByImpact with actual counts
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
        
        // Get actual violation details
        const violations = await Violation.find({ crawlId: crawl._id })
          .select('id impact description help helpUrl')
          .lean();
        
        crawl.violations = violations;
        console.log(`Found ${violations.length} violations for crawl ${crawl._id}`);
        
        return crawl;
      }));

      res.json(crawlsWithViolations);
    } catch (error) {
      console.error('Get crawls error:', error);
      res.status(500).json({ error: 'Failed to fetch crawls' });
    }
  },
  async cancelCrawl(req, res) {
    try {
      // Validate crawl ID
      if (!req.params.id || req.params.id === 'undefined') {
        return res.status(400).json({ error: 'Invalid crawl ID' });
      }

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
      if (['in_progress', 'pending', 'queued'].includes(crawl.status)) {
        console.log(`Attempting to cancel crawl ${crawl._id} with status ${crawl.status}`);
        
        // Cancel the crawl in both services
        // First, cancel in the crawler service if it's running
        if (crawl.status === 'in_progress') {
          await crawlerService.cancelCrawl(crawl._id);
        }
        
        // Then, make sure it's removed from the queue
        if (['queued', 'pending'].includes(crawl.status)) {
          await queueService.cancelQueuedCrawl(crawl._id);
        }
        
        // Update the crawl status
        crawl.status = 'cancelled';
        crawl.completedAt = new Date();
        await crawl.save();
        
        console.log(`Successfully cancelled crawl ${crawl._id}`);
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
  },
  async getCrawl(req, res) {
    try {
      const crawl = await Crawl.findById(req.params.id)
        .populate('team', 'name _id')
        .lean();

      // Fetch violations separately
      const violations = await Violation.find({ crawlId: req.params.id })
        .select('-crawlId -createdAt -updatedAt -__v')
        .lean();

      if (!crawl) {
        return res.status(404).json({ error: 'Crawl not found' });
      }

      // Add violations to crawl response
      crawl.violations = violations;

      res.json(crawl);
    } catch (error) {
      console.error('Error fetching crawl:', error);
      res.status(500).json({ error: 'Failed to fetch crawl' });
    }
  },
  async getQueueStatus(req, res) {
    try {
      // Count active crawls
      const activeCrawls = await Crawl.countDocuments({
        status: 'in_progress'
      });

      // Count queued crawls
      const queuedCrawls = await Crawl.countDocuments({
        status: 'queued'
      });

      res.json({
        active: activeCrawls,
        queued: queuedCrawls
      });
    } catch (error) {
      console.error('Get queue status error:', error);
      res.status(500).json({ error: 'Failed to fetch queue status' });
    }
  },
  async getScheduledCrawls(req, res) {
    try {
      const query = { isScheduled: true };
      
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
        
        query.$or = [
          { team: { $in: teamIds } },
          { createdBy: req.user._id }
        ];
      }

      const scheduledCrawls = await Crawl.find(query)
        .sort({ nextScheduledRun: 1 })
        .populate('createdBy', 'name email')
        .populate('team', 'name')
        .lean();

      res.json(scheduledCrawls);
    } catch (error) {
      console.error('Get scheduled crawls error:', error);
      res.status(500).json({ error: 'Failed to fetch scheduled crawls' });
    }
  },
  async updateScheduledCrawl(req, res) {
    try {
      const crawl = await Crawl.findById(req.params.id);
      
      if (!crawl) {
        return res.status(404).json({ error: 'Crawl not found' });
      }

      // Check authorization
      if (!['network_admin', 'admin'].includes(req.user.role) && 
          crawl.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized to update this crawl' });
      }

      const { isScheduled, scheduleFrequency } = req.body;
      
      // Update scheduling properties
      crawl.isScheduled = isScheduled;
      
      if (isScheduled) {
        crawl.scheduleFrequency = scheduleFrequency || crawl.scheduleFrequency || 'weekly';
        
        // If unscheduled and now scheduled again, set next run date
        if (!crawl.nextScheduledRun) {
          const now = new Date();
          let nextRun = new Date(now);
          
          switch (crawl.scheduleFrequency) {
            case 'daily':
              nextRun.setDate(nextRun.getDate() + 1);
              break;
            case 'weekly':
              nextRun.setDate(nextRun.getDate() + 7);
              break;
            case 'monthly':
              nextRun.setMonth(nextRun.getMonth() + 1);
              break;
            default:
              nextRun.setDate(nextRun.getDate() + 7);
          }
          
          crawl.nextScheduledRun = nextRun;
        }
      } else {
        // If removing schedule, clear next run date
        crawl.nextScheduledRun = null;
      }

      await crawl.save();
      
      res.json(crawl);
    } catch (error) {
      console.error('Update scheduled crawl error:', error);
      res.status(500).json({ error: 'Failed to update scheduled crawl' });
    }
  },
  async updateCrawl(req, res) {
    try {
      const crawl = await Crawl.findById(req.params.id);
      
      if (!crawl) {
        return res.status(404).json({ error: 'Crawl not found' });
      }

      // Check authorization
      if (!['network_admin', 'admin'].includes(req.user.role) && 
          crawl.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized to update this crawl' });
      }

      const { title } = req.body;
      
      // Only update fields that were provided
      if (title !== undefined) {
        crawl.title = title;
      }

      await crawl.save();
      
      res.json(crawl);
    } catch (error) {
      console.error('Update crawl error:', error);
      res.status(500).json({ error: 'Failed to update crawl' });
    }
  }
};

module.exports = crawlController; 