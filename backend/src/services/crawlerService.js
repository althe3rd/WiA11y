const axios = require('axios');
const cheerio = require('cheerio');
const { Builder } = require('selenium-webdriver');
const axeCore = require('axe-core');
const Crawl = require('../models/crawl');
const Violation = require('../models/violation');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const CHROME_TMPFS_DIR = '/dev/shm/chrome-tmp';

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
    try {
      await Crawl.findByIdAndUpdate(crawlId, updates);
      const updatedCrawl = await Crawl.findById(crawlId);
      console.log('Crawl updated successfully:', {
        id: crawlId,
        status: updatedCrawl.status,
        pagesScanned: updatedCrawl.pagesScanned,
        violationsFound: updatedCrawl.violationsFound,
        accessibilityScore: updatedCrawl.accessibilityScore
      });
    } catch (error) {
      console.error('Error updating crawl status:', error);
      throw error;
    }
  }

  getTempDir(crawlId) {
    // Create a unique hash based on crawlId and timestamp
    const uniqueHash = crypto.createHash('md5')
      .update(`${crawlId}-${Date.now()}`)
      .digest('hex');
    
    return path.join(os.tmpdir(), 'wia11y', uniqueHash);
  }

  async killChrome() {
    try {
      if (process.platform === 'linux') {
        await execAsync('pkill -f chromium || true');
        await execAsync('pkill -f chrome || true');
        console.log('Killed existing Chrome/Chromium processes');
      }
    } catch (error) {
      // Ignore errors as they likely mean no Chrome processes were found
      console.log('No existing Chrome/Chromium processes found');
    }
  }

  async ensureTempfsDirectory() {
    try {
      // Create tmpfs directory if it doesn't exist
      if (!fs.existsSync(CHROME_TMPFS_DIR)) {
        fs.mkdirSync(CHROME_TMPFS_DIR, { recursive: true });
      }
      
      // Set permissions
      fs.chmodSync(CHROME_TMPFS_DIR, 0o777);
      
      console.log('Chrome tmpfs directory ready:', {
        path: CHROME_TMPFS_DIR,
        exists: fs.existsSync(CHROME_TMPFS_DIR),
        permissions: fs.statSync(CHROME_TMPFS_DIR).mode
      });
    } catch (error) {
      console.error('Error setting up tmpfs directory:', error);
      throw error;
    }
  }

  async ensureChromeBinary() {
    if (process.env.NODE_ENV === 'production') {
      const chromeBinary = '/usr/bin/chromium';
      try {
        if (!fs.existsSync(chromeBinary)) {
          throw new Error(`Chromium binary not found at ${chromeBinary}`);
        }

        // Check if executable and readable
        try {
          fs.accessSync(chromeBinary, fs.constants.X_OK | fs.constants.R_OK);
        } catch (error) {
          console.log('Setting Chromium binary permissions');
          fs.chmodSync(chromeBinary, 0o755);
        }

        // Try to execute Chromium directly
        try {
          const { stdout } = await execAsync(`${chromeBinary} --version`);
          console.log('Chromium version:', stdout.trim());
        } catch (error) {
          console.error('Error running Chromium binary directly:', error);
        }

        const stats = fs.statSync(chromeBinary);
        console.log('Chromium binary verified:', {
          path: chromeBinary,
          exists: true,
          executable: !!(stats.mode & fs.constants.X_OK),
          readable: !!(stats.mode & fs.constants.R_OK),
          size: stats.size,
          mode: stats.mode.toString(8),
          uid: stats.uid,
          gid: stats.gid
        });
      } catch (error) {
        console.error('Chromium binary verification failed:', error);
        throw error;
      }
    }
  }

  async crawlDomain(crawlId, domain, crawlRate, depthLimit, pageLimit) {
    await this.killChrome();
    await this.ensureChromeBinary();
    
    // Initialize tracking structures for this crawl
    this.currentDomain = domain;
    this.queue = [];
    this.visitedUrlsByCrawl.set(crawlId, new Set());
    this.urlDepths.clear();
    
    console.log(`Starting crawl for ${domain} with ID ${crawlId}`);
    
    const options = new chrome.Options();
    options.addArguments(
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--headless',
      '--window-size=1920,1080'
    );

    // Set Chromium binary path
    if (process.env.NODE_ENV === 'production') {
      options.setChromeBinaryPath('/usr/bin/chromium');
    }

    let driver;
    try {
      driver = await new Builder()
        .forBrowser('chrome')
        .usingServer('http://selenium-hub:4444/wd/hub') // Connect to Selenium Grid
        .setChromeOptions(options)
        .build();

      await driver.manage().setTimeouts({
        implicit: 10000,
        pageLoad: 30000,
        script: 30000
      });

      this.activeJobs.set(crawlId, { driver, isRunning: true });
      
      await this.updateCrawlStatus(crawlId, { 
        status: 'in_progress', 
        startedAt: new Date(),
        depthLimit,
        pageLimit
      });

      // Try HTTPS first, fall back to HTTP if needed
      try {
        const url = domain.startsWith('http') ? domain : `https://${domain}`;
        this.urlDepths.set(url, 1);
        this.baseUrl = url;
        await this.processUrl(crawlId, url, driver, crawlRate);
        
        // Check if we need to continue processing the queue
        if (this.queue.length > 0) {
          console.log(`Initial page processed, continuing with queue (${this.queue.length} URLs)`);
          await this.processQueue(crawlId, driver, crawlRate);
        }
      } catch (error) {
        console.log('HTTPS failed, trying HTTP');
        const url = domain.startsWith('http') ? domain : `http://${domain}`;
        this.urlDepths.set(url, 1);
        this.baseUrl = url;
        await this.processUrl(crawlId, url, driver, crawlRate);
        
        // Check if we need to continue processing the queue
        if (this.queue.length > 0) {
          console.log(`Initial page processed, continuing with queue (${this.queue.length} URLs)`);
          await this.processQueue(crawlId, driver, crawlRate);
        }
      }
      
      if (this.activeJobs.get(crawlId).isRunning) {
        console.log(`Completing crawl for ${domain}`);
        await this.updateCrawlStatus(crawlId, { 
          status: 'completed',
          completedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Crawl error:', error);
      throw error;
    } finally {
      if (driver) {
        try {
          await driver.quit();
        } catch (quitError) {
          console.error('Error quitting driver:', quitError);
        }
      }
      
      this.activeJobs.delete(crawlId);
      this.visitedUrlsByCrawl.delete(crawlId);
    }
  }

  async processUrl(crawlId, url, driver, crawlRate) {
    console.log(`[Crawl ${crawlId}] Processing URL: ${url}`);
    
    const job = this.activeJobs.get(crawlId);
    if (!job?.isRunning) {
      console.log('Job is not running, skipping URL:', url);
      return;
    }

    const crawl = await Crawl.findById(crawlId);
    console.log(`Current progress: ${crawl.pagesScanned}/${crawl.pageLimit} pages`);

    try {
      // Check if the crawl has been cancelled
      if (crawl.status === 'cancelled') {
        console.log(`Crawl ${crawlId} has been cancelled, stopping processing`);
        job.isRunning = false;
        this.queue = [];
        return;
      }

      if (!job || !job.isRunning) {
        console.log(`Job ${crawlId} is no longer running, skipping processing`);
        this.queue = [];
        return;
      }

      const currentDepth = this.urlDepths.get(url) || 1;
      
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

      if (!this.activeJobs.get(crawlId)?.isRunning) {
        console.log(`Job ${crawlId} was cancelled during processing`);
        return;
      }

      await driver.get(url);
      console.log(`[Crawl ${crawlId}] Successfully loaded page`);
      
      // Add page load timing information
      const navigationTiming = await driver.executeScript(`
        const timing = performance.getEntriesByType('navigation')[0];
        return {
          loadTime: timing.loadEventEnd - timing.navigationStart,
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart
        };
      `);
      console.log(`[Crawl ${crawlId}] Page load metrics:`, navigationTiming);

      // Run axe-core analysis
      const results = await this.runAccessibilityTests(driver, url, crawlId);
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
      
      // Don't process queue here - it creates recursion
      await this.queueLinks(links, url, crawl);
      
      // Update progress after each page
      const progress = (updatedCrawl.pagesScanned / updatedCrawl.pageLimit) * 100;
      
      // Update crawl with progress
      await Crawl.findByIdAndUpdate(crawlId, { 
        $set: { 
          progress: Math.min(progress, 100),
          currentUrl: url
        }
      });
      
      // Let processQueue handle the next URL
      return;
    } catch (error) {
      console.error(`[Crawl ${crawlId}] Error processing URL ${url}:`, error);
      throw error;
    }
  }

  async runAccessibilityTests(driver, url, crawlId) {
    try {
      const crawl = await Crawl.findById(crawlId);
      
      // Configure axe based on WCAG options
      const axeConfig = {
        // Run all rules but filter by tags
        tags: [
          `wcag${crawl.wcagVersion.replace('.', '')}`,
          `wcag${crawl.wcagVersion.replace('.', '')}${crawl.wcagLevel.toLowerCase()}`
        ],
        reporter: 'v2',
        resultTypes: ['violations'],
        // Ensure we're checking everything
        rules: {
          'color-contrast': { enabled: true },
          'frame-title': { enabled: true },
          'image-alt': { enabled: true },
          'input-button-name': { enabled: true },
          'input-image-alt': { enabled: true },
          'label': { enabled: true },
          'link-name': { enabled: true },
          'list': { enabled: true },
          'listitem': { enabled: true },
          'button-name': { enabled: true }
        }
      };
      
      // Inject and run axe-core
      await driver.executeScript(axeCore.source);
      // Add a wait to ensure dynamic content is loaded
      await driver.sleep(2000);
      
      const results = await driver.executeScript(`return axe.run(document, ${JSON.stringify(axeConfig)})`);
      console.log('Axe results for', url, JSON.stringify({
        violations: results.violations.length,
        violationDetails: results.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.length
        })),
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        inapplicable: results.inapplicable.length
      }, null, 2));
      return results;
    } catch (error) {
      console.error(`Error running accessibility tests on ${url}:`, error);
      throw error;
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
    
    let totalViolations = 0;
    let weightedDeductions = 0;

    if (!violations || violations.length === 0) {
      console.log('No violations found for', url);
      return;
    }

    for (const violation of violations) {
      // Ensure violation has an impact level
      if (!violation.impact) {
        console.warn(`Violation without impact level:`, violation);
        continue;
      }

      // Initialize counter if undefined
      if (typeof violationsByImpact[violation.impact] === 'undefined') {
        violationsByImpact[violation.impact] = 0;
      }

      // Count each instance of the violation (each affected node)
      violationsByImpact[violation.impact] += violation.nodes.length;
      
      // Count total violations and their weighted impact
      totalViolations += violation.nodes.length;
      weightedDeductions += violation.nodes.length * impactWeights[violation.impact];

      console.log(`Violation: ${violation.id}`, {
        impact: violation.impact,
        description: violation.description,
        affectedNodes: violation.nodes.length,
        nodeDetails: violation.nodes.map(node => ({
          html: node.html.substring(0, 100) + (node.html.length > 100 ? '...' : ''),
          target: node.target
        }))
      });

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

    // Calculate page score (0-100) based on number and severity of violations
    const baseDeduction = weightedDeductions * 2;
    const pageScore = Math.max(0, Math.min(100, 100 - baseDeduction));
    
    // Get current crawl state
    const crawl = await Crawl.findById(crawlId);
    const newPagesScanned = crawl.pagesScanned + 1;
    
    // Calculate running average score
    const currentTotalScore = crawl.accessibilityScore * crawl.pagesScanned;
    const newAverageScore = (currentTotalScore + pageScore) / newPagesScanned;

    console.log('Page accessibility score calculation:', {
      url,
      totalViolations,
      weightedDeductions,
      baseDeduction,
      pageScore,
      newAverageScore,
      violationsByImpact
    });

    await this.updateCrawlStatus(crawlId, {
      $inc: {
        violationsFound: totalViolations,
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
      const baseUrlObj = new URL(this.baseUrl);
      
      // First check if the hostname matches
      const urlHostname = urlObj.hostname.toLowerCase();
      const baseHostname = baseUrlObj.hostname.toLowerCase();
      
      // Normalize domains for comparison
      const normalizedUrl = urlHostname.replace(/^www\./, '');
      const normalizedBase = baseHostname.replace(/^www\./, '');
      
      if (normalizedUrl !== normalizedBase) {
        return false;
      }
      
      // If hostnames match, check if the URL path starts with the base path
      const basePath = baseUrlObj.pathname.replace(/\/$/, '');
      const urlPath = urlObj.pathname.replace(/\/$/, '');
      
      console.log(`Comparing paths: base=${basePath}, url=${urlPath}`);
      return urlPath.startsWith(basePath);
    } catch (error) {
      console.error('Invalid URL:', url);
      return false;
    }
  }

  async extractLinks(driver) {
    try {
      const links = await driver.executeScript(`
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.href)
          .filter(href => href && href.startsWith('http'));
      `);
      
      console.log('Extracted links:', {
        total: links.length,
        sample: links.slice(0, 3)
      });
      
      return links;
    } catch (error) {
      console.error('Error extracting links:', error);
      return [];
    }
  }

  async cancelCrawl(crawlId) {
    console.log(`Attempting to cancel crawl ${crawlId}`);
    console.log('Active jobs:', Array.from(this.activeJobs.keys()));
    const job = this.activeJobs.get(crawlId);
    
    // Update the crawl status first to prevent new processing
    await this.updateCrawlStatus(crawlId, { 
      status: 'cancelled',
      completedAt: new Date()
    });

    if (job) {
      console.log('Found active job, cancelling...');
      job.isRunning = false;
      // Clear the queue immediately
      this.queue = [];
      try {
        // Stop any ongoing processing
        if (job.driver) {
          try {
            // Attempt to cancel any pending navigation
            await job.driver.executeScript('window.stop()');
          } catch (e) {
            console.log('Error stopping page load:', e);
          }

          // Force close any open pages
          const windows = await job.driver.getAllWindowHandles();
          for (const handle of windows) {
            await job.driver.switchTo().window(handle);
            await job.driver.close();
          }
          // Quit the browser
          await job.driver.quit();
        }
      } catch (error) {
        console.error('Error closing browser:', error);
      }
      
      // Clean up all tracking data
      this.activeJobs.delete(crawlId);
      this.visitedUrlsByCrawl.delete(crawlId);
      this.urlDepths.clear();
      console.log('Crawl cancelled successfully');
    } else {
      console.log('No active job found for this ID');
    }
  }

  async queueLinks(links, sourceUrl, crawl) {
    const currentDepth = this.urlDepths.get(sourceUrl);
    console.log(`Processing ${links.length} links from URL at depth ${currentDepth}`);
    console.log(`Current queue size before processing: ${this.queue.length}`);

    // Get current page count to check against limit
    const currentCrawl = await Crawl.findById(crawl._id);
    const remainingPages = currentCrawl.pageLimit - currentCrawl.pagesScanned;
    
    // Ensure visited URLs Set exists
    let visitedUrls = this.visitedUrlsByCrawl.get(crawl._id);
    if (!visitedUrls) {
      visitedUrls = new Set();
      this.visitedUrlsByCrawl.set(crawl._id, visitedUrls);
      console.log('Initialized new visited URLs Set');
    }

    console.log('Crawl status:', {
      pagesScanned: currentCrawl.pagesScanned,
      pageLimit: currentCrawl.pageLimit,
      remainingPages,
      visitedUrlsCount: visitedUrls.size,
      currentQueueSize: this.queue.length
    });

    let queuedCount = 0;
    let validLinks = [];

    for (const link of links) {
      // Normalize URL to prevent duplicates
      const normalizedLink = link.replace(/\/$/, '');
      if (!visitedUrls.has(normalizedLink) && this.isUrlInDomain(link)) {
        const depth = this.getUrlDepth(link);
        // Check depth limit only
        if (depth <= currentCrawl.depthLimit) {
          this.urlDepths.set(link, depth);
          validLinks.push({ link, depth });
        } else {
          console.log(`Skipping ${link} - depth ${depth} exceeds limit ${currentCrawl.depthLimit}`);
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

    console.log(`Added ${queuedCount} new URLs to queue`);
    console.log(`Current queue size after processing: ${this.queue.length}`);
    console.log('Sample of queued URLs:', this.queue.slice(0, 3));
  }

  async processQueue(crawlId, driver, crawlRate) {
    console.log(`Starting queue processing with ${this.queue.length} URLs`);
    
    while (this.queue.length > 0) {
      const crawl = await Crawl.findById(crawlId);
      console.log('Queue processing status:', {
        queueLength: this.queue.length,
        pagesScanned: crawl.pagesScanned,
        pageLimit: crawl.pageLimit,
        status: crawl.status
      });

      // Check limits and status
      if (crawl.status === 'cancelled' || 
          crawl.pagesScanned >= crawl.pageLimit || 
          !this.activeJobs.get(crawlId)?.isRunning) {
        console.log('Stopping queue processing:', {
          status: crawl.status,
          pagesScanned: crawl.pagesScanned,
          pageLimit: crawl.pageLimit
        });
        this.queue = [];
        break;
      }

      const url = this.queue.shift();
      console.log(`Processing URL from queue: ${url}, Remaining: ${this.queue.length}`);
      
      await this.processUrl(crawlId, url, driver, crawlRate);
      
      // Rate limiting between pages
      await new Promise(resolve => setTimeout(resolve, (60 / crawlRate) * 1000));
    }
    
    console.log('Queue processing completed');
  }

  getUrlDepth(url) {
    try {
      const urlObj = new URL(url);
      const baseUrlObj = new URL(this.baseUrl);
      
      // Get the base path and current path
      const basePath = baseUrlObj.pathname.replace(/\/$/, '');
      const currentPath = urlObj.pathname.replace(/\/$/, '');
      
      // If the current path doesn't start with base path, return max depth to exclude it
      if (!currentPath.startsWith(basePath)) {
        return Number.MAX_SAFE_INTEGER;
      }
      
      // Get the relative path by removing the base path
      const relativePath = currentPath.slice(basePath.length);
      
      // Split path into segments and filter out empty segments
      const segments = relativePath.split('/').filter(segment => segment.length > 0);
      
      // Depth is number of additional segments beyond the base path
      const depth = segments.length + 1;
      console.log(`Calculated depth for ${url}: ${depth} (base=${basePath}, relative=${relativePath})`);
      return depth;
    } catch (error) {
      console.error(`Error calculating depth for ${url}:`, error);
      return Number.MAX_SAFE_INTEGER;
    }
  }
}

module.exports = CrawlerService; 