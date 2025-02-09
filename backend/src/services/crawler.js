const processResults = async (results) => {
  console.log('Processing axe results:', results);
  const violations = results.violations;
  console.log('Found violations:', violations);

  // Save violations to crawl
  crawl.violations = violations.map(v => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map(n => ({
      html: n.html,
      target: n.target,
      failureSummary: n.failureSummary
    }))
  }));

  console.log('Mapped violations to save:', crawl.violations);
  
  // Update violation counts
  crawl.violationsByImpact = violations.reduce((acc, v) => {
    acc[v.impact] = (acc[v.impact] || 0) + 1;
    return acc;
  }, {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0
  });

  await crawl.save();
}

const axe = require('axe-core');
const puppeteer = require('puppeteer');
const Crawl = require('../models/crawl');
const Violation = require('../models/violation');

class CrawlerService {
  constructor(crawlId, startUrl, pageLimit) {
    this.crawlId = crawlId;
    this.startUrl = startUrl;
    this.pageLimit = pageLimit;
  }

  async scanPage(page, url) {
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      // Inject and run axe-core
      await page.evaluate(() => {
        return new Promise(async (resolve) => {
          const axeScript = document.createElement('script');
          axeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.0/axe.min.js';
          axeScript.onload = resolve;
          document.head.appendChild(axeScript);
        });
      }).catch(error => {
        console.error(`Failed to inject axe-core for ${url}:`, error);
        return null;
      });
      
      if (!page.isClosed()) {
        console.log('Running axe analysis on:', url);
        const results = await page.evaluate(() => {
          return new Promise((resolve) => {
            axe.run().then(resolve).catch(error => {
              console.error('Axe run error:', error);
              resolve({ violations: [] });
            });
          });
        }).catch(error => {
          console.error(`Failed to run axe analysis for ${url}:`, error);
          return { violations: [] };
        });

        // Process and store the results
        await this.processResults(results, url);
        console.log('Saved violations for page:', url);

        return results;
      }
    } catch (error) {
      console.error('Error in scanPage:', error);
      throw error;
    }
  }

  async processResults(results, url) {
    if (!results.violations?.length) return;
    
    console.log('Processing axe results:', results);
    console.log('Found violations:', results.violations.length);
    
    // Get current crawl
    const crawl = await Crawl.findById(this.crawlId);
    if (!crawl) {
      console.error('Crawl not found:', this.crawlId);
      return;
    }
    
    // Map violations to schema format and create Violation documents
    const violations = await Promise.all(results.violations.map(async v => {
      const violation = new Violation({
        crawlId: this.crawlId,
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        url: url,
        nodes: v.nodes.map(n => ({
          html: n.html,
          target: n.target,
          failureSummary: n.failureSummary
        }))
      });
      await violation.save();
      return violation;
    }));
    
    console.log('Saved violations:', violations.length);
    
    // Update violation counts in crawl document
    crawl.violationsFound += violations.length;
    
    // Reset impact counts
    crawl.violationsByImpact = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0
    };
    
    // Count violations by impact
    violations.forEach(v => {
      if (v.impact) {
        crawl.violationsByImpact[v.impact] = (crawl.violationsByImpact[v.impact] || 0) + 1;
      }
    });
    
    await crawl.save();
  }

  async startCrawl() {
    try {
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox']
      });
      
      const page = await browser.newPage();
      const visited = new Set();
      const queue = [this.startUrl];
      
      // Initialize crawl
      const crawl = await Crawl.findById(this.crawlId);
      if (!crawl) {
        throw new Error(`Crawl not found: ${this.crawlId}`);
      }
      crawl.status = 'in_progress';
      crawl.startedAt = new Date();
      await crawl.save();
      
      while (queue.length > 0 && visited.size < this.pageLimit) {
        const url = queue.shift();
        if (visited.has(url)) continue;
        
        visited.add(url);
        await this.scanPage(page, url);
        
        // Check if we've hit the page limit
        if (visited.size >= this.pageLimit) {
          console.log(`Page limit of ${this.pageLimit} reached, stopping crawl`);
          break;
        }
      }
      
      // Mark crawl as completed
      crawl.status = 'completed';
      crawl.completedAt = new Date();
      await crawl.save();
      
      await browser.close();
    } catch (error) {
      console.error('Crawl error:', error);
      // Update crawl status to failed
      try {
        const crawl = await Crawl.findById(this.crawlId);
        if (crawl) {
          crawl.status = 'failed';
          await crawl.save();
        }
      } catch (updateError) {
        console.error('Error updating crawl status:', updateError);
      }
      throw error;
    } finally {
      try {
        const browser = await puppeteer.launch();
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
}

module.exports = CrawlerService; 