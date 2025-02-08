const Crawl = require('../models/crawl');
const crawlerService = require('../services/crawlerServiceInstance');

const crawlController = {
  async createCrawl(req, res) {
    try {
      const { domain, crawlRate, depthLimit, pageLimit } = req.body;
      
      console.log('Received crawl request:', {
        domain,
        crawlRate,
        depthLimit,
        pageLimit
      });

      // Create new crawl record
      const crawl = new Crawl({
        domain,
        crawlRate,
        depthLimit,
        pageLimit,
        status: 'pending'
      });
      
      console.log('Creating crawl with:', crawl.toObject());
      await crawl.save();
      
      // Start crawling in background
      crawlerService.crawlDomain(crawl._id, domain, crawlRate, depthLimit, pageLimit)
        .catch(error => console.error('Crawl error:', error));
      
      console.log('Crawl record created:', crawl.toObject());
      res.status(201).json(crawl);
    } catch (error) {
      console.error('Create crawl error:', error);
      res.status(500).json({ error: 'Failed to create crawl' });
    }
  },
  async getCrawls(req, res) {
    try {
      const crawls = await Crawl.find().sort({ createdAt: -1 });
      res.json(crawls);
    } catch (error) {
      console.error('Get crawls error:', error);
      res.status(500).json({ error: 'Failed to fetch crawls' });
    }
  },
  async cancelCrawl(req, res) {
    try {
      const { id } = req.params;
      await crawlerService.cancelCrawl(id);
      res.json({ message: 'Crawl cancelled successfully' });
    } catch (error) {
      console.error('Cancel crawl error:', error);
      res.status(500).json({ error: 'Failed to cancel crawl' });
    }
  },
  async deleteCrawl(req, res) {
    try {
      const { id } = req.params;
      const crawl = await Crawl.findById(id);
      
      if (!crawl) {
        return res.status(404).json({ error: 'Crawl not found' });
      }
      
      if (!['completed', 'cancelled'].includes(crawl.status)) {
        return res.status(400).json({ error: 'Only completed or cancelled crawls can be removed' });
      }
      
      await Crawl.findByIdAndDelete(id);
      res.json({ message: 'Crawl removed successfully' });
    } catch (error) {
      console.error('Delete crawl error:', error);
      res.status(500).json({ error: 'Failed to delete crawl' });
    }
  }
};

module.exports = crawlController; 