const CrawlerService = require('./crawlerService');
const Crawl = require('../models/crawl');

// Create a singleton instance
const crawlerService = new CrawlerService();

// Add the startCrawl method that initiates the crawl process
crawlerService.startCrawl = async function(crawlId) {
  try {
    console.log('Starting crawl process for:', crawlId);
    const crawl = await Crawl.findById(crawlId);
    if (!crawl) {
      throw new Error('Crawl not found');
    }

    // Start the actual crawl process
    await this.crawlDomain(
      crawlId,
      crawl.domain,
      crawl.crawlRate,
      crawl.depthLimit,
      crawl.pageLimit
    );
  } catch (error) {
    console.error('Error in crawlerService.startCrawl:', error);
    throw error;
  }
};

module.exports = crawlerService; 