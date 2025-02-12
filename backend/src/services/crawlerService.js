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
const { until, By } = require('selenium-webdriver');

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
        await execAsync('pkill -f chrome');
        console.log('Killed existing Chrome processes');
      }
    } catch (error) {
      // Ignore errors as they likely mean no Chrome processes were found
      console.log('No existing Chrome processes found');
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
      const chromeBinary = '/root/.cache/selenium/chrome/linux64/133.0.6943.53/chrome';
      try {
        if (!fs.existsSync(chromeBinary)) {
          throw new Error(`Chrome binary not found at ${chromeBinary}`);
        }

        // Check for critical libraries
        const requiredLibs = [
          'libatk-1.0.so.0',
          'libatk-bridge-2.0.so.0',
          'libcups.so.2',
          'libdrm.so.2',
          'libxkbcommon.so.0',
          'libxcomposite.so.1',
          'libxdamage.so.1',
          'libxfixes.so.3',
          'libxrandr.so.2',
          'libgbm.so.1',
          'libasound.so.2',
          'libpango-1.0.so.0',
          'libcairo.so.2',
          'libatspi.so.0',
          'libgtk-3.so.0'
        ];

        for (const lib of requiredLibs) {
          try {
            const { stdout, stderr } = await execAsync(`ldconfig -p | grep ${lib}`);
            console.log(`Found library ${lib}:`, stdout.trim());
          } catch (error) {
            console.error(`Missing required library: ${lib}`);
            throw new Error(`Missing required library: ${lib}`);
          }
        }

        // Check if executable and readable
        try {
          fs.accessSync(chromeBinary, fs.constants.X_OK | fs.constants.R_OK);
        } catch (error) {
          console.log('Setting Chrome binary permissions');
          fs.chmodSync(chromeBinary, 0o755);
        }

        // Try to execute Chrome directly
        try {
          const { stdout } = await execAsync(`${chromeBinary} --version`);
          console.log('Chrome version:', stdout.trim());
        } catch (error) {
          console.error('Error running Chrome binary directly:', error);
        }

        // Check for required libraries
        try {
          const { stdout: lddOutput } = await execAsync(`ldd ${chromeBinary}`);
          console.log('Chrome binary dependencies:', lddOutput);
        } catch (error) {
          console.error('Error checking Chrome dependencies:', error);
        }

        const stats = fs.statSync(chromeBinary);
        console.log('Chrome binary verified:', {
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
        console.error('Chrome binary verification failed:', error);
        throw error;
      }
    }
  }

  async crawlDomain(crawlId, startUrl, crawlRate, depthLimit, pageLimit) {
    let driver;
    try {
      console.log('Starting crawl:', {
        crawlId,
        startUrl,
        crawlRate,
        depthLimit,
        pageLimit,
        memoryUsage: process.memoryUsage()
      });

      // Initialize Chrome
      const chromeOptions = new chrome.Options()
        .addArguments('--headless')
        .addArguments('--disable-gpu')
        .addArguments('--no-sandbox')
        .addArguments('--disable-dev-shm-usage')
        .addArguments('--disable-software-rasterizer')
        .addArguments('--disable-extensions')
        .addArguments('--disable-sync')
        .addArguments('--disable-background-networking')
        .addArguments('--disable-default-apps')
        .addArguments('--disable-translate')
        .addArguments('--metrics-recording-only')
        .addArguments('--no-first-run')
        .addArguments('--safebrowsing-disable-auto-update')
        .addArguments('--disable-background-timer-throttling')
        .addArguments('--disable-backgrounding-occluded-windows')
        .addArguments('--disable-client-side-phishing-detection')
        .addArguments('--disable-component-update')
        .addArguments('--disable-domain-reliability')
        .addArguments('--disable-features=TranslateUI')
        .addArguments('--disable-hang-monitor')
        .addArguments('--disable-ipc-flooding-protection')
        .addArguments('--disable-popup-blocking')
        .addArguments('--disable-prompt-on-repost')
        .addArguments('--disable-renderer-backgrounding')
        .addArguments('--force-color-profile=srgb')
        .addArguments('--disable-breakpad')
        .addArguments('--disable-features=InterestFeedContentSuggestions')
        .addArguments('--enable-automation')
        .addArguments('--password-store=basic')
        .addArguments('--use-mock-keychain');

      driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(chromeOptions)
        .build();

      // Initialize tracking structures for this crawl
      this.currentDomain = startUrl.split('/')[2];
      this.queue = [];
      this.visitedUrlsByCrawl.set(crawlId, new Set()); // Initialize visited URLs Set
      this.urlDepths.clear();
      
      console.log(`Starting crawl for ${startUrl} with ID ${crawlId}`);
      console.log(`Limits - Depth: ${depthLimit}, Pages: ${pageLimit}`);
      
      await this.updateCrawlStatus(crawlId, { 
        status: 'in_progress', 
        startedAt: new Date(),
        depthLimit,
        pageLimit
      });

      // Try HTTPS first, fall back to HTTP if needed
      try {
        this.urlDepths.set(startUrl, 1);
        this.baseUrl = startUrl;
        await this.processUrl(crawlId, startUrl, driver, crawlRate);
        
        // Check if we need to continue processing the queue
        if (this.queue.length > 0) {
          console.log(`Initial page processed, continuing with queue (${this.queue.length} URLs)`);
          await this.processQueue(crawlId, driver, crawlRate);
        }
      } catch (error) {
        console.log('HTTPS failed, trying HTTP');
        const url = `http://${startUrl.split('/')[2]}`;
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
        console.log(`Completing crawl for ${startUrl}`);
        await this.updateCrawlStatus(crawlId, { 
          status: 'completed',
          completedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Crawl error:', {
        error: error.message,
        stack: error.stack,
        memoryUsage: process.memoryUsage()
      });
      
      // Update crawl status to failed
      await this.updateCrawlStatus(crawlId, {
        status: 'failed',
        error: error.message
      });
      
      throw error;
    } finally {
      if (driver) {
        try {
          await driver.quit();
        } catch (error) {
          console.error('Error closing browser:', error);
        }
      }
      // Clean up any temporary files
      await this.cleanup(crawlId);
    }
  }

  async processUrl(crawlId, url, driver, crawlRate) {
    try {
      console.log(`Processing URL: ${url}`);
      
      // Get current crawl
      const crawl = await Crawl.findById(crawlId);
      if (!crawl) {
        throw new Error('Crawl not found');
      }

      // Check if we've hit the page limit
      if (crawl.pagesScanned >= crawl.pageLimit) {
        console.log(`Page limit (${crawl.pageLimit}) reached, stopping crawl`);
        await this.updateCrawlStatus(crawlId, {
          status: 'completed',
          completedAt: new Date()
        });
        return;
      }

      // Navigate to URL
      console.log(`Navigating to ${url}`);
      await driver.get(url);
      
      // Wait for page load
      await driver.wait(until.elementLocated(By.tagName('body')), 10000);
      
      // Rest of your existing processUrl code...
    } catch (error) {
      console.error('Error in processUrl:', {
        url,
        error: error.message,
        stack: error.stack
      });
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
    console.log(`Starting queue processing for crawl ${crawlId}`);
    console.log('Initial queue state:', {
      queueSize: this.queue.length,
      visitedUrls: this.visitedUrlsByCrawl.get(crawlId)?.size || 0,
      currentDomain: this.currentDomain
    });

    while (this.queue.length > 0) {
      const crawl = await Crawl.findById(crawlId);
      if (!crawl || crawl.status === 'cancelled') {
        console.log('Crawl cancelled or not found, stopping queue processing');
        await this.updateCrawlStatus(crawlId, {
          status: 'cancelled',
          completedAt: new Date(),
          pagesScanned: crawl.pagesScanned,
          pageLimit: crawl.pageLimit
        });
        this.queue = [];
        break;
      }

      const url = this.queue.shift();
      console.log(`Processing URL from queue:`, {
        url,
        remainingUrls: this.queue.length,
        visitedCount: this.visitedUrlsByCrawl.get(crawlId)?.size || 0,
        memoryUsage: process.memoryUsage()
      });
      
      try {
        await this.processUrl(crawlId, url, driver, crawlRate);
      } catch (error) {
        console.error('Error processing URL:', {
          url,
          error: error.message,
          stack: error.stack
        });
        // Continue with next URL instead of stopping completely
        continue;
      }
      
      // Rate limiting between pages
      await new Promise(resolve => setTimeout(resolve, (60 / crawlRate) * 1000));
    }
    
    console.log('Queue processing completed', {
      visitedUrls: this.visitedUrlsByCrawl.get(crawlId)?.size || 0,
      memoryUsage: process.memoryUsage()
    });
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

  async cleanup(crawlId) {
    // Clean up the profile directory
    const uniqueProfileDir = this.getTempDir(crawlId);
    if (fs.existsSync(uniqueProfileDir)) {
      fs.rmSync(uniqueProfileDir, { recursive: true, force: true });
      console.log('Cleaned up Chrome profile directory:', uniqueProfileDir);
    }
    
    this.activeJobs.delete(crawlId);
    this.visitedUrlsByCrawl.delete(crawlId);
    this.urlDepths.clear();
  }

  async monitorMemory(crawlId) {
    const memoryUsage = process.memoryUsage();
    console.log('Memory usage for crawl', crawlId, {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
    });

    // If memory usage is too high, trigger garbage collection
    if (memoryUsage.heapUsed > 1024 * 1024 * 1024) { // 1GB
      console.log('High memory usage detected, attempting cleanup');
      if (global.gc) {
        global.gc();
      }
    }
  }
}

module.exports = CrawlerService; 