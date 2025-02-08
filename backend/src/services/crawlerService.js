const axios = require('axios');
const cheerio = require('cheerio');
const { Builder } = require('selenium-webdriver');
const axeCore = require('axe-core');
const Crawl = require('../models/crawl');
const Violation = require('../models/violation');

class CrawlerService {
  constructor() {
    this.visitedUrls = new Set();
    this.queue = [];
    this.activeJobs = new Map(); // Store active crawl jobs by ID
    this.currentDomain = ''; // Store the current domain being crawled
  }

  async updateCrawlStatus(crawlId, updates) {
    console.log(`Updating crawl ${crawlId} status:`, updates);
    await Crawl.findByIdAndUpdate(crawlId, updates);
  }

  async crawlDomain(crawlId, domain, crawlRate) {
    console.log(`Starting crawl for ${domain} with ID ${crawlId}`);
    this.currentDomain = domain;
    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions({
        binary: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      })
      .build();
    this.activeJobs.set(crawlId, { driver, isRunning: true });
    
    try {
      await this.updateCrawlStatus(crawlId, { status: 'in_progress', startedAt: new Date() });
      // Initialize crawl with homepage
      await this.processUrl(crawlId, `https://${domain}`, driver, crawlRate);
      await this.processQueue(crawlId, driver, crawlRate);
      
      if (this.activeJobs.get(crawlId).isRunning) {
        console.log(`Completing crawl for ${domain}`);
        await this.updateCrawlStatus(crawlId, { 
          status: 'completed',
          completedAt: new Date()
        });
      }
    } catch (error) {
      console.error(`Crawl error for ${domain}:`, error);
      await this.updateCrawlStatus(crawlId, { 
        status: 'failed',
        error: error.message
      });
    } finally {
      await driver.quit();
      this.activeJobs.delete(crawlId);
    }
  }

  async processUrl(crawlId, url, driver, crawlRate) {
    console.log(`Processing URL: ${url}`);
    const job = this.activeJobs.get(crawlId);
    if (!job || !job.isRunning) return;
    
    if (this.visitedUrls.has(url)) return;
    this.visitedUrls.add(url);

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, (60 / crawlRate) * 1000));

    try {
      await driver.get(url);
      
      // Run axe-core analysis
      await driver.executeScript(axeCore.source);
      const results = await driver.executeScript('return axe.run()');
      await this.saveViolations(crawlId, url, results.violations);

      // Extract links and add to queue
      const links = await this.extractLinks(driver);
      console.log(`Found ${links.length} links on ${url}`);
      this.queueLinks(links);
      
      // Update progress
      await this.updateCrawlStatus(crawlId, {
        $inc: { pagesScanned: 1 }
      });
    } catch (error) {
      console.error(`Error processing ${url}:`, error);
    }
  }

  async saveViolations(crawlId, url, violations) {
    const violationsByImpact = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0
    };

    for (const violation of violations) {
      violationsByImpact[violation.impact]++;
      
      await Violation.create({
        crawlId,
        url,
        impact: violation.impact,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map(node => ({
          html: node.html,
          target: node.target,
          failureSummary: node.failureSummary
        }))
      });
    }

    await this.updateCrawlStatus(crawlId, {
      $inc: {
        violationsFound: violations.length,
        'violationsByImpact.critical': violationsByImpact.critical,
        'violationsByImpact.serious': violationsByImpact.serious,
        'violationsByImpact.moderate': violationsByImpact.moderate,
        'violationsByImpact.minor': violationsByImpact.minor
      }
    });
  }

  isUrlInDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === this.currentDomain ||
             urlObj.hostname === `www.${this.currentDomain}` ||
             `www.${urlObj.hostname}` === this.currentDomain;
    } catch (error) {
      console.error('Invalid URL:', url);
      return false;
    }
  }

  async extractLinks(driver) {
    const links = await driver.executeScript(`
      return Array.from(document.links)
        .map(link => link.href)
        .filter(href => href.startsWith('http') || href.startsWith('https'));
    `);
    return links.filter(link => this.isUrlInDomain(link));
  }

  async cancelCrawl(crawlId) {
    console.log(`Attempting to cancel crawl ${crawlId}`);
    console.log('Active jobs:', Array.from(this.activeJobs.keys()));
    const job = this.activeJobs.get(crawlId);
    if (job) {
      console.log('Found active job, cancelling...');
      job.isRunning = false;
      await job.driver.quit();
      this.activeJobs.delete(crawlId);
      await this.updateCrawlStatus(crawlId, { 
        status: 'cancelled',
        completedAt: new Date()
      });
    } else {
      console.log('No active job found for this ID');
      // Update status even if job not found in memory
      await this.updateCrawlStatus(crawlId, { 
        status: 'cancelled',
        completedAt: new Date()
      });
    }
  }

  async queueLinks(links) {
    for (const link of links) {
      if (!this.visitedUrls.has(link) && this.isUrlInDomain(link)) {
        this.queue.push(link);
      }
    }
  }

  async processQueue(crawlId, driver, crawlRate) {
    while (this.queue.length > 0 && this.activeJobs.get(crawlId)?.isRunning) {
      const url = this.queue.shift();
      await this.processUrl(crawlId, url, driver, crawlRate);
    }
  }
}

module.exports = CrawlerService; 