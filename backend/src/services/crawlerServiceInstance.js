const CrawlerService = require('./crawlerService');
const Crawl = require('../models/crawl');
const { spawn } = require('child_process');
const path = require('path');

// Create a singleton instance
const crawlerService = new CrawlerService();

// Track ongoing crawl processes
const runningCrawlProcesses = new Map();

// Helper script for running the crawl process
const CRAWL_RUNNER_SCRIPT = path.resolve(__dirname, '../scripts/runCrawl.js');

// Update the startCrawl method to run each crawl in a dedicated process
crawlerService.startCrawl = async function(crawlId) {
  try {
    console.log('Starting crawl process for:', crawlId);
    
    // Check if the crawl already exists
    const crawl = await Crawl.findById(crawlId);
    if (!crawl) {
      throw new Error('Crawl not found');
    }
    
    // Check if a process is already running for this crawl
    if (runningCrawlProcesses.has(crawlId.toString())) {
      console.log(`Process already running for crawl ${crawlId}`);
      return;
    }
    
    // Start the crawl in a completely separate process
    // This ensures true parallel processing
    console.log(`Spawning new process for crawl ${crawlId}`);
    
    // Fire and forget - don't wait for the process to complete
    this.crawlDomain(
      crawlId,
      crawl.domain,
      crawl.crawlRate,
      crawl.depthLimit,
      crawl.pageLimit
    ).catch(error => {
      console.error(`Error in background crawl for ${crawlId}:`, error);
    });
    
    // Return immediately to allow queueService to process other crawls
    return Promise.resolve();
  } catch (error) {
    console.error('Error in crawlerService.startCrawl:', error);
    throw error;
  }
};

// Update to properly clean up processes when canceled
crawlerService.cancelCrawl = async function(crawlId) {
  try {
    console.log(`Canceling crawl ${crawlId}`);
    
    // Call the original cancelCrawl method
    await CrawlerService.prototype.cancelCrawl.call(this, crawlId);
    
    // Clean up the process if it exists
    const crawlProcess = runningCrawlProcesses.get(crawlId.toString());
    if (crawlProcess) {
      console.log(`Terminating process for crawl ${crawlId}`);
      // Kill the process
      crawlProcess.kill('SIGTERM');
      // Remove from the process map
      runningCrawlProcesses.delete(crawlId.toString());
    }
    
    console.log(`Crawl ${crawlId} successfully canceled`);
  } catch (error) {
    console.error(`Error canceling crawl ${crawlId}:`, error);
    throw error;
  }
};

module.exports = crawlerService; 