const Crawl = require('../models/crawl');
const crawlerService = require('../services/crawlerServiceInstance');

const crawlController = {
  async createCrawl(req, res) {
    try {
      const { domain, crawlRate } = req.body;
      
      // Create new crawl record
      const crawl = new Crawl({
        domain,
        crawlRate,
        status: 'pending'
      });
      
      await crawl.save();
      
      // Start crawling in background
      crawlerService.crawlDomain(crawl._id, domain, crawlRate)
        .catch(error => console.error('Crawl error:', error));
      
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
      
      if (!['pending', 'cancelled'].includes(crawl.status)) {
        return res.status(400).json({ error: 'Only pending or cancelled crawls can be removed' });
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