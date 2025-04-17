/**
 * Scheduler Service
 * 
 * This service manages scheduled crawls:
 * - Checks for crawls that are due to run based on their schedule
 * - Creates new crawl instances based on scheduled crawls
 * - Updates the next scheduled run time after a crawl completes
 */

const Crawl = require('../models/crawl');
const queueService = require('./queueService');

class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
  }

  /**
   * Start the scheduler service
   * @param {Number} intervalMinutes - How often to check for scheduled crawls (in minutes)
   */
  start(intervalMinutes = 15) {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    console.log(`Starting scheduler service. Checking every ${intervalMinutes} minutes for scheduled crawls.`);
    this.isRunning = true;

    // Run immediately on startup
    this.checkScheduledCrawls();

    // Then set up recurring check
    const intervalMs = intervalMinutes * 60 * 1000;
    this.checkInterval = setInterval(() => {
      this.checkScheduledCrawls();
    }, intervalMs);
  }

  /**
   * Stop the scheduler service
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping scheduler service');
    clearInterval(this.checkInterval);
    this.checkInterval = null;
    this.isRunning = false;
  }

  /**
   * Check for scheduled crawls that are due to run
   */
  async checkScheduledCrawls() {
    try {
      console.log('Checking for scheduled crawls...');
      const now = new Date();

      // Find all scheduled crawls that are due to run (nextScheduledRun is in the past)
      const dueCrawls = await Crawl.find({
        isScheduled: true,
        nextScheduledRun: { $lte: now }
      });

      console.log(`Found ${dueCrawls.length} scheduled crawls due to run`);

      // Process each due crawl
      for (const crawl of dueCrawls) {
        await this.runScheduledCrawl(crawl);
      }
    } catch (error) {
      console.error('Error checking scheduled crawls:', error);
    }
  }

  /**
   * Run a scheduled crawl and update its next run time
   * @param {Object} scheduledCrawl - The scheduled crawl to run
   */
  async runScheduledCrawl(scheduledCrawl) {
    try {
      console.log(`Running scheduled crawl for domain: ${scheduledCrawl.domain}`);

      // Create a new crawl based on the scheduled crawl
      const newCrawl = new Crawl({
        url: scheduledCrawl.url,
        domain: scheduledCrawl.domain,
        team: scheduledCrawl.team,
        createdBy: scheduledCrawl.createdBy,
        depthLimit: scheduledCrawl.depthLimit,
        pageLimit: scheduledCrawl.pageLimit,
        crawlRate: scheduledCrawl.crawlRate,
        wcagVersion: scheduledCrawl.wcagVersion,
        wcagLevel: scheduledCrawl.wcagLevel,
        status: 'pending',
        parentCrawlId: scheduledCrawl._id // Reference to the original scheduled crawl
      });

      await newCrawl.save();

      // Add the new crawl to the queue
      await queueService.addToQueue(newCrawl._id);

      // Update the next scheduled run time
      await this.updateNextScheduledRun(scheduledCrawl);

    } catch (error) {
      console.error(`Error running scheduled crawl ${scheduledCrawl._id}:`, error);
    }
  }

  /**
   * Update the next scheduled run time for a crawl
   * @param {Object} scheduledCrawl - The scheduled crawl to update
   */
  async updateNextScheduledRun(scheduledCrawl) {
    const now = new Date();
    let nextRun = new Date(now);

    // Calculate next run date based on frequency
    switch (scheduledCrawl.scheduleFrequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
      default:
        // Default to weekly
        nextRun.setDate(nextRun.getDate() + 7);
    }

    console.log(`Updating next scheduled run for crawl ${scheduledCrawl._id} to ${nextRun}`);

    // Update the crawl with the new next run date
    await Crawl.findByIdAndUpdate(scheduledCrawl._id, {
      nextScheduledRun: nextRun
    });
  }
}

// Create and export a singleton instance
const schedulerService = new SchedulerService();
module.exports = schedulerService; 