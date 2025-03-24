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
    // Each crawler instance has its own queue and tracking
    this.activeJobs = new Map(); // Store active crawl jobs by ID
    this.visitedUrlsByCrawl = new Map(); // Track visited URLs per crawl
    
    // Make sure we don't have shared state between crawls
    this._initializeCrawlState = (crawlId) => {
      return {
        queue: [],
        urlDepths: new Map(),
        visitedUrls: new Set(),
        isRunning: true,
        currentDepth: 0,
        driver: null,
        baseUrl: '',
        scannedPages: 0
      };
    };
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
    try {
      console.log(`[Crawl ${crawlId}] Beginning crawl of ${domain}`);
      
      await this.ensureChromeBinary();
      
      // Initialize state for this crawl
      const crawlState = this._initializeCrawlState(crawlId);
      
      // Ensure we have a set to track visited URLs for this crawl
      this.visitedUrlsByCrawl.set(crawlId, crawlState.visitedUrls);
      
      // Create Chrome options
      const options = new chrome.Options();
      options.addArguments(
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--headless',
        '--window-size=1920,1080'
      );
      
      // Set Chromium binary path in production
      if (process.env.NODE_ENV === 'production') {
        options.setChromeBinaryPath('/usr/bin/chromium');
      }
      
      // Create a dedicated driver for this crawl
      try {
        crawlState.driver = await new Builder()
          .forBrowser('chrome')
          .usingServer('http://selenium-hub:4444/wd/hub') // Connect to Selenium Grid
          .setChromeOptions(options)
          .build();
        
        // Set timeouts
        await crawlState.driver.manage().setTimeouts({
          implicit: 10000,
          pageLoad: 30000,
          script: 30000
        });
      } catch (error) {
        console.error(`[Crawl ${crawlId}] Error creating driver:`, error);
        throw error;
      }
      
      // Add the job to active jobs
      this.activeJobs.set(crawlId, crawlState);
      
      // Update crawl status to in_progress
      await this.updateCrawlStatus(crawlId, {
        status: 'in_progress',
        startedAt: new Date()
      });
      
      try {
        // Add starting URL to queue
        const startUrl = domain.startsWith('http') ? domain : `https://${domain}`;
        crawlState.baseUrl = startUrl;
        crawlState.queue.push(startUrl);
        crawlState.urlDepths.set(startUrl, 1);
        
        console.log(`[Crawl ${crawlId}] Starting with URL: ${startUrl}`);
        
        // Process the queue
        while (crawlState.isRunning && 
               crawlState.queue.length > 0 && 
               (pageLimit === 0 || crawlState.scannedPages < pageLimit)) {
          
          // Check if crawl has been cancelled
          const crawl = await Crawl.findById(crawlId);
          if (crawl.status === 'cancelled') {
            console.log(`[Crawl ${crawlId}] Crawl has been cancelled, stopping.`);
            break;
          }
          
          // Get the next URL from the queue
          const url = crawlState.queue.shift();
          
          // Skip if we've already visited this URL
          if (crawlState.visitedUrls.has(url)) {
            continue;
          }
          
          // Mark as visited
          crawlState.visitedUrls.add(url);
          
          try {
            // Apply rate limiting
            await new Promise(resolve => setTimeout(resolve, (60 / crawlRate) * 1000));
            
            // Process the URL
            console.log(`[Crawl ${crawlId}] Processing URL: ${url}`);
            
            // Navigate to the URL
            await crawlState.driver.get(url);
            
            // Run accessibility tests
            const results = await this.runAccessibilityTests(crawlState.driver, url, crawlId);
            
            // Save violations
            await this.saveViolations(crawlId, url, results.violations);
            
            // Extract links
            const links = await this.extractLinks(crawlState.driver);
            console.log(`[Crawl ${crawlId}] Found ${links.length} links on ${url}`);
            
            // Filter and add links to queue
            for (const link of links) {
              // Don't add links we've already visited
              if (crawlState.visitedUrls.has(link)) {
                continue;
              }
              
              // Check if link is in the same domain
              if (!this.isUrlInDomain(link, crawlState.baseUrl)) {
                continue;
              }
              
              // Calculate depth
              const depth = this.getUrlDepth(link, crawlState.baseUrl);
              
              // Skip if exceeding depth limit
              if (depth > depthLimit) {
                continue;
              }
              
              // Add to queue if we haven't scanned too many pages
              if (pageLimit === 0 || crawlState.scannedPages + crawlState.queue.length < pageLimit) {
                crawlState.queue.push(link);
                crawlState.urlDepths.set(link, depth);
              }
            }
            
            // Update crawl status
            crawlState.scannedPages++;
            const progress = pageLimit > 0 ? (crawlState.scannedPages / pageLimit) * 100 : 0;
            
            await this.updateCrawlStatus(crawlId, {
              $inc: { pagesScanned: 1 },
              progress: Math.min(progress, 100),
              currentUrl: url
            });
            
          } catch (error) {
            console.error(`[Crawl ${crawlId}] Error processing URL ${url}:`, error);
            // Continue with next URL
          }
        }
        
        // Crawl completed
        console.log(`[Crawl ${crawlId}] Crawl completed. Scanned ${crawlState.scannedPages} pages.`);
        
        await this.updateCrawlStatus(crawlId, {
          status: 'completed',
          completedAt: new Date()
        });
        
      } finally {
        // Clean up
        if (crawlState.driver) {
          try {
            await crawlState.driver.quit();
          } catch (error) {
            console.error(`[Crawl ${crawlId}] Error quitting driver:`, error);
          }
        }
        
        // Remove from active jobs
        this.activeJobs.delete(crawlId);
        console.log(`[Crawl ${crawlId}] Cleaned up resources`);
      }
      
    } catch (error) {
      console.error(`[Crawl ${crawlId}] Error in crawlDomain:`, error);
      
      // Update crawl status to failed
      await this.updateCrawlStatus(crawlId, {
        status: 'failed',
        completedAt: new Date()
      });
      
      throw error;
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

      // Normalize URL to prevent duplicates with/without trailing slash and remove anchor fragments
      const normalizedUrl = url.replace(/\/$/, '').split('#')[0];
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
          'button-name': { enabled: true },
          'region': { 
            enabled: true,
            // Configure the region rule to better handle skip links
            options: {
              // This selector will match common skip link patterns and exempt them from the region rule
              selector: 'a[href^="#"]:not([role]):not([aria-hidden="true"])',
              // Set to true to exempt elements matching the selector from needing to be in a landmark
              exemptFromRegion: true
            }
          }
        }
      };
      
      // Inject and run axe-core
      await driver.executeScript(axeCore.source);
      // Add a wait to ensure dynamic content is loaded
      await driver.sleep(2000);
      
      // Add custom script to modify axe-core behavior for skip links before running tests
      await driver.executeScript(`
        // Add a custom rule override for region to better handle skip links
        if (typeof axe !== 'undefined' && axe.configure) {
          // First, identify skip links by their text content and href
          const skipLinkSelectors = [];
          
          // Find all links that might be skip links
          const potentialSkipLinks = document.querySelectorAll('a[href^="#"]');
          potentialSkipLinks.forEach(link => {
            const linkText = link.textContent.toLowerCase();
            // Check if the link text contains common skip link phrases
            if (
              linkText.includes('skip') || 
              linkText.includes('jump to') || 
              linkText.includes('go to content') ||
              linkText.includes('main content')
            ) {
              // This is likely a skip link - add its specific selector
              const href = link.getAttribute('href');
              skipLinkSelectors.push(\`a[href="\${href}"]\`);
            }
          });
          
          // Create a combined selector for all identified skip links
          const skipLinksSelector = skipLinkSelectors.length > 0 
            ? skipLinkSelectors.join(', ') 
            : 'a[href^="#"]:not([role]):not([aria-hidden="true"])';
          
          // Configure axe to exclude these skip links from the region rule
          axe.configure({
            rules: [{
              id: 'region',
              selector: \`body *:not(\${skipLinksSelector})\`
            }]
          });
        }
      `);
      
      const results = await driver.executeScript(`return axe.run(document, ${JSON.stringify(axeConfig)})`);
      
      // Post-process results to filter out region violations related to skip links
      if (results.violations && results.violations.length > 0) {
        // Find the region rule violations
        const regionViolationIndex = results.violations.findIndex(v => v.id === 'region');
        
        if (regionViolationIndex !== -1) {
          const regionViolation = results.violations[regionViolationIndex];
          
          // Filter out nodes that are likely skip links
          regionViolation.nodes = regionViolation.nodes.filter(node => {
            // Check if this node contains a skip link
            const html = node.html || '';
            const target = node.target || [];
            
            // Skip link detection patterns
            const isLikelySkipLink = (
              // Check HTML content for skip link patterns
              (html.toLowerCase().includes('skip') && html.toLowerCase().includes('content')) ||
              html.toLowerCase().includes('jump to main') ||
              html.toLowerCase().includes('skip to main') ||
              // Check if the target is a link with an anchor href
              (target.some(selector => selector.includes('a[href^="#"]')))
            );
            
            // Keep the node only if it's NOT a skip link
            return !isLikelySkipLink;
          });
          
          // If all nodes were filtered out, remove the violation entirely
          if (regionViolation.nodes.length === 0) {
            results.violations.splice(regionViolationIndex, 1);
          }
        }
      }
      
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
    // Normalize URL by removing anchor fragments
    const normalizedUrl = url.split('#')[0];
    
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
      console.log('No violations found for', normalizedUrl);
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
        url: normalizedUrl,
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
      url: normalizedUrl,
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

  isUrlInDomain(url, baseUrl) {
    try {
      // Remove anchor fragments before creating URL object
      const urlWithoutAnchor = url.split('#')[0];
      const urlObj = new URL(urlWithoutAnchor);
      const baseUrlObj = new URL(baseUrl);
      
      // First check if the hostname matches
      const urlHostname = urlObj.hostname.toLowerCase();
      const baseHostname = baseUrlObj.hostname.toLowerCase();
      
      // Normalize domains for comparison
      const normalizedUrl = urlHostname.replace(/^www\./, '');
      const normalizedBase = baseHostname.replace(/^www\./, '');
      
      if (normalizedUrl !== normalizedBase) {
        return false;
      }
      
      return true;
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
    if (!crawlId) {
      console.error('Invalid crawl ID provided to cancelCrawl');
      return;
    }
    
    console.log(`Attempting to cancel crawl ${crawlId}`);
    console.log('Active jobs:', Array.from(this.activeJobs.keys()));
    const job = this.activeJobs.get(crawlId);
    
    // Update the crawl status first to prevent new processing
    await this.updateCrawlStatus(crawlId, { 
      status: 'cancelled',
      completedAt: new Date()
    });
    
    // Note: Queue service will handle its own cleanup
    // Emit an event or publish a message that the crawl was cancelled
    console.log(`Crawl ${crawlId} marked as cancelled`);

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
          try {
            const windows = await job.driver.getAllWindowHandles();
            for (const handle of windows) {
              await job.driver.switchTo().window(handle);
              await job.driver.close();
            }
            // Quit the browser
            await job.driver.quit();
          } catch (closeError) {
            console.error('Error closing browser windows:', closeError);
            // Try to force quit anyway
            try {
              await job.driver.quit();
            } catch (quitError) {
              console.error('Error quitting driver after window close error:', quitError);
            }
          }
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
      // Normalize URL to prevent duplicates and remove anchor fragments
      const normalizedLink = link.replace(/\/$/, '').split('#')[0];
      if (!visitedUrls.has(normalizedLink) && this.isUrlInDomain(link, crawl.baseUrl)) {
        const depth = this.getUrlDepth(link, crawl.baseUrl);
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

  getUrlDepth(url, baseUrl) {
    try {
      // Remove anchor fragments before creating URL object
      const urlWithoutAnchor = url.split('#')[0];
      const urlObj = new URL(urlWithoutAnchor);
      const baseUrlObj = new URL(baseUrl);
      
      // Get the base path and current path
      const basePath = baseUrlObj.pathname.replace(/\/$/, '');
      const currentPath = urlObj.pathname.replace(/\/$/, '');
      
      // If paths are identical, it's the same as the base (depth 1)
      if (currentPath === basePath) {
        return 1;
      }
      
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
      return depth;
    } catch (error) {
      console.error(`Error calculating depth for ${url}:`, error);
      return Number.MAX_SAFE_INTEGER;
    }
  }

  // Add a method to update the active crawls - will be called by queueService
  updateActiveCrawls(crawlId, isActive) {
    // This can be implemented if needed
    console.log(`CrawlerService: ${isActive ? 'Adding' : 'Removing'} crawl ${crawlId} from active crawls`);
  }
}

module.exports = CrawlerService; 