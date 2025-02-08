const axios = require('axios');
const cheerio = require('cheerio');
const { Builder } = require('selenium-webdriver');
const axeCore = require('axe-core');
const Crawl = require('../models/crawl');
const Violation = require('../models/violation');

class CrawlerService {
  constructor() {
    this.queue = [];
    this.activeJobs = new Map(); // Store active crawl jobs by ID
    this.currentDomain = ''; // Store the current domain being crawled
    this.urlDepths = new Map(); // Track URL depths
    this.baseUrl = '';  // Store the base URL (will be set after first successful connection)
    this.visitedUrlsByCrawl = new Map(); // Track visited URLs per crawl
  }

  async updateCrawlStatus(crawlId, updates) {
    console.log(`Updating crawl ${crawlId} status:`, updates);
    await Crawl.findByIdAndUpdate(crawlId, updates);
  }

  async crawlDomain(crawlId, domain, crawlRate, depthLimit, pageLimit) {
    console.log(`Starting crawl for ${domain} with ID ${crawlId}`);
    console.log(`Limits - Depth: ${depthLimit}, Pages: ${pageLimit}`);
    this.currentDomain = domain;
    this.urlDepths.clear();
    this.visitedUrlsByCrawl.set(crawlId, new Set());
    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions({
        binary: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      })
      .build();
    this.activeJobs.set(crawlId, { driver, isRunning: true });
    
    try {
      await this.updateCrawlStatus(crawlId, { 
        status: 'in_progress', 
        startedAt: new Date(),
        depthLimit,
        pageLimit
      });

      // Try HTTPS first, fall back to HTTP if needed
      try {
        const url = `https://${domain}`;
        this.urlDepths.set(url, 1);
        this.baseUrl = url;
        await this.processUrl(crawlId, url, driver, crawlRate);
      } catch (error) {
        console.log('HTTPS failed, trying HTTP');
        const url = `http://${domain}`;
        this.urlDepths.set(url, 1);
        this.baseUrl = url;
        await this.processUrl(crawlId, url, driver, crawlRate);
      }
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
      this.visitedUrlsByCrawl.delete(crawlId);
    }
  }

  async processUrl(crawlId, url, driver, crawlRate) {
    console.log(`Processing URL: ${url}`);
    const job = this.activeJobs.get(crawlId);
    if (!job || !job.isRunning) {
      console.log(`Job ${crawlId} is no longer running, skipping processing`);
      this.queue = [];
      return;
    }

    const currentDepth = this.urlDepths.get(url) || 1;
    const crawl = await Crawl.findById(crawlId);
    
    console.log(`Processing URL at depth ${currentDepth}/${crawl.depthLimit}, pages scanned: ${crawl.pagesScanned}/${crawl.pageLimit}`);

    // Normalize URL to prevent duplicates with/without trailing slash
    const normalizedUrl = url.replace(/\/$/, '');
    const visitedUrls = this.visitedUrlsByCrawl.get(crawlId);
    if (!visitedUrls) {
      console.error(`No visited URLs Set found for crawl ${crawlId}, reinitializing...`);
      this.visitedUrlsByCrawl.set(crawlId, new Set());
    }
    const visitedUrlsSet = this.visitedUrlsByCrawl.get(crawlId);

    if (visitedUrlsSet.has(normalizedUrl)) {
      console.log(`Skipping already visited URL: ${url}`);
      return;
    }
    visitedUrlsSet.add(normalizedUrl);
    
    console.log(`Processing ${url} at depth ${currentDepth}/${crawl.depthLimit}`);

    console.log(`Current depth: ${currentDepth}, Limit: ${crawl.depthLimit}`);
    if (currentDepth > crawl.depthLimit) {
      console.log(`Skipping ${url} - exceeds depth limit of ${crawl.depthLimit}`);
      return;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, (60 / crawlRate) * 1000));

    try {
      if (!this.activeJobs.get(crawlId)?.isRunning) {
        console.log(`Job ${crawlId} was cancelled during processing`);
        return;
      }

      await driver.get(url);
      // Wait for page load
      await driver.wait(async () => {
        const state = await driver.executeScript('return document.readyState');
        return state === 'complete';
      }, 10000);
      console.log(`Successfully loaded ${url}`);
      
      // Run axe-core analysis
      await driver.executeScript(axeCore.source);
      const results = await driver.executeScript('return axe.run()');
      await this.saveViolations(crawlId, url, results.violations);

      // Update progress before queueing new links
      await this.updateCrawlStatus(crawlId, {
        $inc: { pagesScanned: 1 }
      });

      // Check page limit after incrementing
      const updatedCrawl = await Crawl.findById(crawlId);
      if (updatedCrawl.pagesScanned >= updatedCrawl.pageLimit) {
        console.log(`Page limit of ${updatedCrawl.pageLimit} reached, stopping crawl`);
        job.isRunning = false;
        await this.updateCrawlStatus(crawlId, { 
          status: 'completed',
          completedAt: new Date()
        });
        return;
      }

      // Extract links and add to queue
      const links = await this.extractLinks(driver);
      console.log(`Found ${links.length} links on ${url}`);
      await this.queueLinks(links, url, crawl);
      
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

    // Impact weights for score calculation
    const impactWeights = {
      critical: 5,
      serious: 3,
      moderate: 2,
      minor: 1
    };
    
    let totalDeduction = 0;

    for (const violation of violations) {
      violationsByImpact[violation.impact]++;
      
      // Calculate score deduction based on violation impact
      totalDeduction += impactWeights[violation.impact];

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

    // Calculate page score (0-100)
    const pageScore = Math.max(0, 100 - (totalDeduction * 2));
    
    // Get current crawl state
    const crawl = await Crawl.findById(crawlId);
    const newPagesScanned = crawl.pagesScanned + 1;
    
    // Calculate running average score
    const currentTotalScore = crawl.accessibilityScore * crawl.pagesScanned;
    const newAverageScore = (currentTotalScore + pageScore) / newPagesScanned;

    await this.updateCrawlStatus(crawlId, {
      $inc: {
        violationsFound: violations.length,
        'violationsByImpact.critical': violationsByImpact.critical,
        'violationsByImpact.serious': violationsByImpact.serious,
        'violationsByImpact.moderate': violationsByImpact.moderate,
        'violationsByImpact.minor': violationsByImpact.minor,
        pagesScanned: 1
      },
      $set: {
        accessibilityScore: newAverageScore
      }
    });
  }

  isUrlInDomain(url) {
    try {
      const urlObj = new URL(url);
      const urlHostname = urlObj.hostname.toLowerCase();
      const targetDomain = this.currentDomain.toLowerCase();
      
      // Normalize domains for comparison
      const normalizedUrl = urlHostname.replace(/^www\./, '');
      const normalizedTarget = targetDomain.replace(/^www\./, '');
      
      console.log(`Comparing ${normalizedUrl} with ${normalizedTarget}`);
      return normalizedUrl === normalizedTarget;
    } catch (error) {
      console.error('Invalid URL:', url);
      return false;
    }
  }

  async extractLinks(driver) {
    const links = await driver.executeScript(`
      return Array.from(document.querySelectorAll('a[href]'))
        .map(link => {
          try {
            return new URL(link.href).toString();
          } catch (e) {
            return null;
          }
        })
        .filter(href => href && (href.startsWith('http') || href.startsWith('https')));
    `);
    console.log('All found links:', links);
    return links.filter(link => this.isUrlInDomain(link));
  }

  async cancelCrawl(crawlId) {
    console.log(`Attempting to cancel crawl ${crawlId}`);
    console.log('Active jobs:', Array.from(this.activeJobs.keys()));
    const job = this.activeJobs.get(crawlId);
    if (job) {
      console.log('Found active job, cancelling...');
      job.isRunning = false;
      this.queue = [];
      try {
        const windows = await job.driver.getAllWindowHandles();
        for (const handle of windows) {
          await job.driver.switchTo().window(handle);
          await job.driver.close();
        }
        await job.driver.quit();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
      this.activeJobs.delete(crawlId);
      this.visitedUrlsByCrawl.delete(crawlId);
      this.urlDepths.clear();
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

  async queueLinks(links, sourceUrl, crawl) {
    const currentDepth = this.urlDepths.get(sourceUrl);
    console.log(`Queueing links from URL at depth ${currentDepth}`);

    // Get current page count to check against limit
    const currentCrawl = await Crawl.findById(crawl._id);
    const remainingPages = currentCrawl.pageLimit - currentCrawl.pagesScanned;
    console.log(`Pages scanned: ${currentCrawl.pagesScanned}, Page limit: ${currentCrawl.pageLimit}, Remaining: ${remainingPages}`);

    const visitedUrls = this.visitedUrlsByCrawl.get(crawl._id);
    if (!visitedUrls) {
      console.error(`No visited URLs Set found for crawl ${crawl._id}, reinitializing...`);
      this.visitedUrlsByCrawl.set(crawl._id, new Set());
    }
    const visitedUrlsSet = this.visitedUrlsByCrawl.get(crawl._id);

    let queuedCount = 0;
    let validLinks = [];

    for (const link of links) {
      // Normalize URL to prevent duplicates
      const normalizedLink = link.replace(/\/$/, '');
      if (!visitedUrlsSet.has(normalizedLink) && this.isUrlInDomain(link)) {
        const depth = this.getUrlDepth(link);
        // Check depth limit only
        if (depth <= crawl.depthLimit) {
          this.urlDepths.set(link, depth);
          validLinks.push({ link, depth });
        } else {
          console.log(`Skipping ${link} - depth ${depth} exceeds limit ${crawl.depthLimit}`);
        }
      }
    }

    // Sort valid links by depth
    validLinks.sort((a, b) => a.depth - b.depth);
    
    // Add links up to the remaining page limit
    for (const { link, depth } of validLinks) {
      if (queuedCount < remainingPages) {
        console.log(`Adding ${link} at depth ${depth} (queued: ${queuedCount + 1}/${remainingPages})`);
        this.queue.push(link);
        queuedCount++;
      } else {
        console.log(`Skipping ${link} - page limit reached (${currentCrawl.pageLimit})`);
      }
    }

    console.log(`Queue now contains ${this.queue.length} URLs`);
  }

  async processQueue(crawlId, driver, crawlRate) {
    console.log(`Starting queue processing with ${this.queue.length} URLs`);
    while (this.queue.length > 0) {
      if (!this.activeJobs.get(crawlId)?.isRunning) {
        console.log(`Job ${crawlId} was cancelled, stopping queue processing`);
        this.queue = [];
        break;
      }
      const url = this.queue.shift();
      console.log(`Processing URL from queue: ${url}, Remaining in queue: ${this.queue.length}`);
      if (!this.activeJobs.get(crawlId)?.isRunning) {
        console.log('Job was cancelled while processing queue');
        break;
      }
      await this.processUrl(crawlId, url, driver, crawlRate);
    }
    console.log('Queue processing completed');
  }

  getUrlDepth(url) {
    try {
      const urlObj = new URL(url);
      const basePath = new URL(this.baseUrl).pathname;
      const currentPath = urlObj.pathname;
      
      // Remove base path if it exists
      const relativePath = currentPath.startsWith(basePath) 
        ? currentPath.slice(basePath.length) 
        : currentPath;
      
      // Split path into segments and filter out empty segments
      const segments = relativePath.split('/').filter(segment => segment.length > 0);
      
      // Depth is number of path segments + 1 (for the base URL)
      const depth = segments.length + 1;
      console.log(`Calculated depth for ${url}: ${depth} (segments: ${segments.join('/')})`);
      return depth;
    } catch (error) {
      console.error(`Error calculating depth for ${url}:`, error);
      return 1;
    }
  }
}

module.exports = CrawlerService; 