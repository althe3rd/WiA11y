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
const { until } = require('selenium-webdriver');
const VisitedUrl = require('../models/VisitedUrl'); // Import the model

const CHROME_TMPFS_DIR = '/dev/shm/chrome-tmp';

class CrawlerService {
  constructor() {
    this.queue = [];
    this.activeJobs = new Map(); // Store active crawl jobs by ID
    this.currentDomain = ''; // Store the current domain being crawled
    this.urlDepths = new Map(); // Track URL depths
    this.baseUrl = '';  // Store the base URL (will be set after first successful connection)
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

  async crawlDomain(crawlId, domain, crawlRate, depthLimit, pageLimit) {
    await this.killChrome();
    await this.ensureChromeBinary();
    
    // Initialize tracking structures for this crawl
    this.currentDomain = domain;
    this.queue = [];
    this.urlDepths.clear();
    
    console.log(`Starting crawl for ${domain} with ID ${crawlId}`);
    console.log(`Limits - Depth: ${depthLimit}, Pages: ${pageLimit}`);
    
    const options = new chrome.Options();
    
    // Update Chrome arguments
    options.addArguments(
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--ignore-certificate-errors',
      '--disable-extensions',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--enable-javascript',
      '--disable-blink-features=AutomationControlled',
      '--enable-features=NetworkService,NetworkServiceInProcess'
    );

    // Add experimental options for better stealth
    options.set('excludeSwitches', ['enable-automation']);
    options.set('useAutomationExtension', false);

    // Set the Chrome binary path explicitly in production
    const chromeBinary = process.env.NODE_ENV === 'production'
      ? '/root/.cache/selenium/chrome/linux64/133.0.6943.53/chrome'
      : undefined;

    if (chromeBinary) {
      options.setChromeBinaryPath(chromeBinary);
      console.log('Using Chrome binary:', chromeBinary);
      
      // Add Chrome debugging flags in production
      options.addArguments(
        '--enable-logging',
        '--v=1',
        '--log-path=/tmp/chrome.log'
      );
    }

    // Add additional logging for link extraction
    console.log('Chrome options:', options);

    // Create a unique profile directory for this crawl
    const uniqueProfileDir = path.join(
      os.tmpdir(),
      'wia11y-profiles',
      `profile-${crawlId.toString()}-${Date.now()}`
    );

    // Ensure the profiles directory exists and is clean
    if (fs.existsSync(uniqueProfileDir)) {
      fs.rmSync(uniqueProfileDir, { recursive: true, force: true });
    }
    fs.mkdirSync(uniqueProfileDir, { recursive: true });
    fs.chmodSync(uniqueProfileDir, 0o777);

    let driver;
    try {
      console.log('Building Chrome driver with options:', JSON.stringify(options, null, 2));
      driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
      
      console.log('Chrome driver built successfully');

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
        const url = `https://${domain}`;
        this.urlDepths.set(url, 1);
        this.baseUrl = url;
        await this.processUrl(crawlId, url, driver, crawlRate);
        
        // Check if we need to continue processing the queue
        if (this.queue.length > 0) {
          console.log(`Initial page processed, continuing with queue (${this.queue.length} URLs)`);
          await this.processQueue(crawlId);
        }
      } catch (error) {
        console.log('HTTPS failed, trying HTTP');
        const url = `http://${domain}`;
        this.urlDepths.set(url, 1);
        this.baseUrl = url;
        await this.processUrl(crawlId, url, driver, crawlRate);
        
        // Check if we need to continue processing the queue
        if (this.queue.length > 0) {
          console.log(`Initial page processed, continuing with queue (${this.queue.length} URLs)`);
          await this.processQueue(crawlId);
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
      console.error(`Crawl error for ${domain}:`, error);
      console.error('Chrome options used:', options);
      
      await this.updateCrawlStatus(crawlId, { 
        status: 'failed',
        error: error.message
      });
    } finally {
      if (driver) {
        try {
          await driver.quit();
        } catch (quitError) {
          console.error('Error quitting driver:', quitError);
        }
      }
      
      // Clean up the profile directory
      try {
        if (fs.existsSync(uniqueProfileDir)) {
          fs.rmSync(uniqueProfileDir, { recursive: true, force: true });
          console.log('Cleaned up Chrome profile directory:', uniqueProfileDir);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up profile directory:', cleanupError);
      }
      
      this.activeJobs.delete(crawlId);
    }
  }

  async processUrl(crawlId, url, driver, crawlRate, retryCount = 0) {
    const MAX_RETRIES = 2;
    
    const job = this.activeJobs.get(crawlId);
    if (!job?.isRunning) {
      console.log('Job is not running, skipping URL:', url);
      return;
    }

    const crawl = await Crawl.findById(crawlId);
    console.log(`Processing URL: ${url}`);
    console.log(`Current progress: ${crawl.pagesScanned}/${crawl.pageLimit} pages`);

    try {
      // Add more logging around page load
      console.log(`Starting to load URL: ${url}`);
      await driver.get(url);
      console.log('Page loaded, waiting for readyState...');

      await driver.wait(async () => {
        const state = await driver.executeScript('return document.readyState');
        console.log('Current readyState:', state);
        return state === 'complete';
      }, 30000);

      console.log('Page fully loaded, checking DOM content...');
      
      // Log the page content length to verify we're getting content
      const pageContent = await driver.executeScript('return document.documentElement.outerHTML');
      console.log('Page content length:', pageContent.length);
      
      // Check if we can find any <a> tags
      const linkCount = await driver.executeScript('return document.getElementsByTagName("a").length');
      console.log('Number of <a> tags found:', linkCount);

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
      console.error('Error in processUrl:', {
        url: url,
        error: error.message,
        stack: error.stack,
        retry: retryCount
      });
      
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying ${url} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.processUrl(crawlId, url, driver, crawlRate, retryCount + 1);
      }
      
      // If all retries failed, mark as visited and continue
      await this.markUrlAsVisited(crawlId, url);
      return;
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

  async extractLinks(driver) {
    try {
      console.log('Starting link extraction...');
      
      // Get all links using JavaScript
      const links = await driver.executeScript(`
        const links = Array.from(document.querySelectorAll('a[href]'))
          .map(a => {
            try {
              return new URL(a.href).toString();
            } catch (e) {
              console.error('Invalid URL:', a.href);
              return null;
            }
          })
          .filter(url => url !== null);
        console.log('Found links:', links);
        return links;
      `);

      console.log('Raw links extracted:', links.length);
      
      // Filter and normalize links
      const normalizedLinks = links
        .map(link => {
          try {
            const url = new URL(link);
            // Log each link's domain for debugging
            console.log('Processing link:', {
              original: link,
              hostname: url.hostname,
              pathname: url.pathname,
              isInDomain: this.isUrlInDomain(link)
            });
            return url.toString();
          } catch (e) {
            console.error('Error normalizing URL:', link, e);
            return null;
          }
        })
        .filter(link => link !== null);

      console.log('Normalized links:', normalizedLinks.length);
      return normalizedLinks;
    } catch (error) {
      console.error('Error in extractLinks:', {
        error: error.message,
        stack: error.stack
      });
      return [];
    }
  }

  async isUrlInDomain(url) {
    try {
      const urlObj = new URL(url);
      const result = urlObj.hostname.includes(this.currentDomain);
      console.log('Domain check:', {
        url: url,
        hostname: urlObj.hostname,
        currentDomain: this.currentDomain,
        isInDomain: result
      });
      return result;
    } catch (error) {
      console.error('Error in isUrlInDomain:', {
        url: url,
        error: error.message
      });
      return false;
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
      this.urlDepths.clear();
      console.log('Crawl cancelled successfully');
    } else {
      console.log('No active job found for this ID');
    }
  }

  async queueLinks(links, sourceUrl, crawl) {
    console.log('queueLinks called with:', {
      numberOfLinks: links.length,
      sourceUrl,
      crawlId: crawl._id
    });

    const currentDepth = this.urlDepths.get(sourceUrl);
    console.log(`Processing ${links.length} links from URL at depth ${currentDepth}`);
    console.log('Current urlDepths map:', Array.from(this.urlDepths.entries()));
    console.log(`Current queue size before processing: ${this.queue.length}`);

    // Get current page count to check against limit
    const currentCrawl = await Crawl.findById(crawl._id);
    const remainingPages = currentCrawl.pageLimit - currentCrawl.pagesScanned;
    
    console.log('Crawl status:', {
      pagesScanned: currentCrawl.pagesScanned,
      pageLimit: currentCrawl.pageLimit,
      remainingPages
    });

    let queuedCount = 0;
    let validLinks = [];

    // Process all links first
    for (const link of links) {
      console.log('Processing link:', link);
      const normalizedLink = link.replace(/\/$/, '');
      const visited = await this.isUrlVisited(crawl._id, normalizedLink);
      const isInDomain = this.isUrlInDomain(link);
      
      console.log('Link check:', {
        original: link,
        normalized: normalizedLink,
        visited,
        isInDomain,
        currentDepth,
        depthLimit: currentCrawl.depthLimit
      });

      if (!visited && isInDomain) {
        const depth = this.getUrlDepth(link);
        if (depth <= currentCrawl.depthLimit) {
          this.urlDepths.set(link, depth);
          validLinks.push({ link, depth });
          console.log(`Valid link found: ${link} at depth ${depth}`);
        } else {
          console.log(`Skipping ${link} - depth ${depth} exceeds limit ${currentCrawl.depthLimit}`);
        }
      } else {
        console.log(`Skipping ${link} - ${visited ? 'already visited' : 'not in domain'}`);
      }
    }

    console.log('Valid links found:', validLinks.length);

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
            break;
        }
    }

    console.log(`Added ${queuedCount} new URLs to queue`);
    console.log(`Current queue size after processing: ${this.queue.length}`);
    console.log('Sample of queued URLs:', this.queue.slice(0, 3));
  }

  async processQueue(crawlId) {
    try {
      const crawl = await Crawl.findById(crawlId);
      if (!crawl) return;

      const job = this.activeJobs.get(crawlId);
      if (!job || !job.driver) {
        console.error('No active driver found for crawl:', crawlId);
        return;
      }

      while (this.queue.length > 0 && crawl.pagesScanned < crawl.pageLimit) {
        const url = this.queue.shift();
        const normalizedUrl = url.replace(/\/$/, '');
        
        // Check if URL was visited using database
        const visited = await this.isUrlVisited(crawlId, normalizedUrl);
        if (visited) {
          console.log(`Skipping already visited URL: ${url}`);
          continue;
        }

        // Process the URL with the correct driver object
        await this.processUrl(crawlId, url, job.driver, crawl.crawlRate);
        
        // Mark URL as visited
        await this.markUrlAsVisited(crawlId, normalizedUrl);
      }

      // Complete crawl if queue is empty
      if (this.queue.length === 0) {
        await this.completeCrawl(crawlId);
      }
    } catch (error) {
      console.error('Error processing queue:', error);
      throw error;
    }
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

  // Add method to check if URL was visited
  async isUrlVisited(crawlId, url) {
    try {
      const visited = await VisitedUrl.findOne({ crawlId, url });
      return !!visited; // Return true if found, false otherwise
    } catch (error) {
      console.error('Error checking if URL is visited:', error);
      // Handle the error appropriately.  Maybe return 'true' to be safe?
      return true;
    }
  }

  // Add method to mark URL as visited
  async markUrlAsVisited(crawlId, url) {
    try {
      await VisitedUrl.create({ crawlId, url });
    } catch (error) {
      // If it's a duplicate key error, that's fine (we've already visited it)
      if (error.code !== 11000) {
        console.error('Error marking URL as visited:', error);
      }
    }
  }

  async completeCrawl(crawlId) {
    await this.updateCrawlStatus(crawlId, { 
      status: 'completed',
      completedAt: new Date()
    });
    this.queue = [];
    this.urlDepths.clear();
  }

  // Add the startCrawl method
  async startCrawl(crawlId) {
    try {
      console.log('Starting crawl process for:', crawlId);
      const crawl = await Crawl.findById(crawlId);
      if (!crawl) {
        throw new Error('Crawl not found');
      }

      // Add a small delay to allow UI to show loading state
      await new Promise(resolve => setTimeout(resolve, 1000));

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
      // Update crawl status to failed if there's an error
      await this.updateCrawlStatus(crawlId, { 
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = CrawlerService; 