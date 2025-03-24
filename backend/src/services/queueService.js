const Queue = require('../models/queue');
const Crawl = require('../models/crawl');
// Require the static instance instead of a circular dependency
const crawlerService = require('./crawlerServiceInstance');
const Settings = require('../models/Settings');

class QueueService {
  constructor() {
    this.isProcessing = false;
    this.processingTimeout = null;
    this.activeCrawls = new Set(); // Track currently active crawls
  }

  async addToQueue(crawlId) {
    try {
      console.log('Adding crawl to queue:', crawlId);
      // Get the last position in queue
      const lastItem = await Queue.findOne({
        status: 'queued'
      }).sort({ position: -1 });

      console.log('Last queue item:', lastItem);
      const position = lastItem ? lastItem.position + 1 : 1;

      // Create queue item
      const queueItem = await Queue.create({
        crawlId,
        position,
        status: 'queued'
      });

      console.log('Created queue item:', queueItem);

      // Update crawl status to indicate it's queued
      await Crawl.findByIdAndUpdate(crawlId, {
        status: 'queued',
        queuePosition: position
      });

      // Start processing queue if not already processing
      this.startProcessing();

      return queueItem;
    } catch (error) {
      console.error('Error adding to queue:', error);
      // Update crawl status to failed if queue addition fails
      await Crawl.findByIdAndUpdate(crawlId, {
        status: 'failed'
      });
      throw error;
    }
  }

  startProcessing() {
    // Use setTimeout to avoid multiple simultaneous processQueue calls
    if (!this.processingTimeout && !this.isProcessing) {
      this.processingTimeout = setTimeout(() => {
        this.processQueue();
      }, 100);
    }
  }

  async getMaxCrawlers() {
    // Get the maximum number of parallel crawlers from settings
    try {
      const settings = await Settings.findOne();
      console.log('Settings retrieved:', settings ? {
        maxCrawlers: settings.maxCrawlers,
        _id: settings._id
      } : 'No settings found');
      
      return settings?.maxCrawlers || 1; // Default to 1 if not set
    } catch (error) {
      console.error('Error getting maxCrawlers setting:', error);
      return 1; // Fall back to 1 if there's an error
    }
  }

  async processQueue() {
    if (this.isProcessing) {
      console.log('Queue is already being processed, skipping this call');
      return;
    }
    
    try {
      this.isProcessing = true;
      this.processingTimeout = null;

      // Get max crawlers setting
      const maxCrawlers = await this.getMaxCrawlers();
      
      // Check for database consistency - look for crawls marked as in_progress
      const activeCrawlsInDb = await Crawl.countDocuments({ status: 'in_progress' });
      const serviceCrawlCount = this.activeCrawls.size;
      
      console.log(`Processing queue with maxCrawlers: ${maxCrawlers}`);
      console.log(`Active crawls - Service: ${serviceCrawlCount}, Database: ${activeCrawlsInDb}`);
      console.log('Active crawls in service:', Array.from(this.activeCrawls));
      
      // Reconcile active crawls count - use the higher of the two numbers
      const effectiveActiveCrawls = Math.max(serviceCrawlCount, activeCrawlsInDb);
      
      // Check how many crawl slots are available based on the reconciled count
      const availableSlots = Math.max(0, maxCrawlers - effectiveActiveCrawls);
      
      if (availableSlots <= 0) {
        console.log(`No available slots for crawling, max:${maxCrawlers}, active:${effectiveActiveCrawls}, waiting for active crawls to finish`);
        this.isProcessing = false;
        return;
      }

      // Get next queue items up to available slots
      const nextItems = await Queue.find({
        status: 'queued'
      }).sort({ position: 1 }).limit(availableSlots);

      if (nextItems.length === 0) {
        console.log('No queued items to process');
        this.isProcessing = false;
        return;
      }

      console.log(`Found ${nextItems.length} items to process with ${availableSlots} available slots`);

      // Double check we don't exceed maxCrawlers (belt and suspenders approach)
      // This should prevent issues where the count isn't accurate
      let allowedItems = nextItems;
      if (nextItems.length > availableSlots) {
        console.warn(`Warning: Found more items (${nextItems.length}) than available slots (${availableSlots}), limiting processing`);
        allowedItems = nextItems.slice(0, availableSlots);
      }
      
      // IMPORTANT: Process each queue item in parallel by creating an array of promises
      // This is key to parallelizing the crawls
      const processingPromises = [];
      
      for (const nextItem of allowedItems) {
        // Make sure we're still within limits before starting each crawl
        const currentActive = await Crawl.countDocuments({ status: 'in_progress' });
        if (currentActive >= maxCrawlers) {
          console.warn(`Maximum crawlers (${maxCrawlers}) already reached with ${currentActive} active crawls. Not starting new crawl.`);
          continue;
        }
        
        // Create a new promise for each item and push it to the array
        const processPromise = (async () => {
          try {
            // Double check that this item isn't already being processed
            const crawl = await Crawl.findById(nextItem.crawlId);
            if (!crawl) {
              console.error(`Crawl ${nextItem.crawlId} not found, marking queue item as failed`);
              nextItem.status = 'failed';
              await nextItem.save();
              return;
            }
            
            if (crawl.status === 'in_progress') {
              // Skip this item
              console.log(`Crawl ${nextItem.crawlId} is already in progress, marking queue item as completed`);
              nextItem.status = 'completed';
              await nextItem.save();
              return;
            }

            // Update status to processing
            nextItem.status = 'processing';
            await nextItem.save();

            // Update crawl status
            await Crawl.findByIdAndUpdate(nextItem.crawlId, {
              status: 'in_progress',
              startedAt: new Date()
            });

            // Add to active crawls set
            const crawlIdString = nextItem.crawlId.toString();
            this.activeCrawls.add(crawlIdString);
            console.log(`Added crawl ${crawlIdString} to active crawls. Total active: ${this.activeCrawls.size}`);
            console.log(`Active crawls: ${Array.from(this.activeCrawls).join(', ')}`);

            try {
              // Process the crawl - THIS SHOULD NOT BLOCK OTHER CRAWLS FROM STARTING
              await crawlerService.startCrawl(nextItem.crawlId);
              
              // Mark as completed
              nextItem.status = 'completed';
              await nextItem.save();

              // Update crawl status if not already updated by crawler
              const updatedCrawl = await Crawl.findById(nextItem.crawlId);
              if (updatedCrawl.status === 'in_progress') {
                updatedCrawl.status = 'completed';
                updatedCrawl.completedAt = new Date();
                await updatedCrawl.save();
              }
            } catch (error) {
              console.error('Error processing crawl:', error);
              nextItem.status = 'failed';
              await nextItem.save();
              
              // Update crawl status
              await Crawl.findByIdAndUpdate(nextItem.crawlId, {
                status: 'failed'
              });
            } finally {
              // Remove from active crawls set
              if (this.activeCrawls.has(crawlIdString)) {
                console.log(`Removing crawl ${crawlIdString} from active crawls`);
                this.activeCrawls.delete(crawlIdString);
              } else {
                console.error(`Could not find crawl ${crawlIdString} in active crawls to remove`);
              }
              console.log(`Crawl complete, remaining active crawls: ${Array.from(this.activeCrawls).join(', ')}`);
            }
          } catch (error) {
            console.error(`Error processing queue item ${nextItem._id}:`, error);
          }
        })();
        
        processingPromises.push(processPromise);
      }

      // Wait for all processing to complete WITHOUT blocking each individual process
      await Promise.all(processingPromises);

      // Reorder remaining queue items
      await this.reorderQueue();
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.isProcessing = false;
      
      // Check if there are more items to process and we have available slots
      const pendingItems = await Queue.findOne({ status: 'queued' });
      const maxCrawlers = await this.getMaxCrawlers();
      const currentActive = this.activeCrawls.size;
      
      console.log(`Queue processing complete. Pending: ${pendingItems ? 'Yes' : 'No'}, Active: ${currentActive}/${maxCrawlers}`);
      
      if (pendingItems && currentActive < maxCrawlers) {
        console.log('Starting next queue processing cycle immediately');
        this.startProcessing();
      } else if (pendingItems) {
        // If we have pending items but all slots are full, set a timeout to check again later
        console.log('All slots full, scheduling next check in 5 seconds');
        setTimeout(() => this.startProcessing(), 5000);
      } else {
        console.log('No pending items, queue processing complete');
      }
    }
  }

  async reorderQueue() {
    const queueItems = await Queue.find({
      status: 'queued'
    }).sort({ position: 1 });

    // Reassign positions sequentially
    for (let i = 0; i < queueItems.length; i++) {
      queueItems[i].position = i + 1;
      await queueItems[i].save();
      
      // Update crawl with new queue position
      await Crawl.findByIdAndUpdate(queueItems[i].crawlId, {
        queuePosition: i + 1
      });
    }
  }

  async getQueuePosition(crawlId) {
    const queueItem = await Queue.findOne({ crawlId });
    return queueItem?.position || null;
  }

  async getQueueItems() {
    return await Queue.find({ status: 'queued' }).sort({ position: 1 });
  }

  getActiveCrawls() {
    return Array.from(this.activeCrawls);
  }

  resetActiveCrawls() {
    console.log(`Resetting active crawls. Before: ${this.activeCrawls.size} crawls in set`);
    const oldCrawls = Array.from(this.activeCrawls);
    
    // Clear the set
    this.activeCrawls.clear();
    
    console.log('Active crawls have been reset to 0');
    return oldCrawls;
  }

  async cancelQueuedCrawl(crawlId) {
    try {
      console.log(`Cancelling queued crawl ${crawlId}`);
      
      // Find the queue item
      const queueItem = await Queue.findOne({ crawlId });
      
      if (!queueItem) {
        console.log(`No queue item found for crawl ${crawlId}`);
        return;
      }
      
      // Mark the queue item as completed (effectively removing it from processing)
      if (['queued', 'processing'].includes(queueItem.status)) {
        queueItem.status = 'completed';
        await queueItem.save();
        console.log(`Marked queue item for crawl ${crawlId} as completed`);
      }
      
      // Remove from active crawls if it's currently active
      if (this.activeCrawls.has(crawlId.toString())) {
        this.activeCrawls.delete(crawlId.toString());
        console.log(`Removed crawl ${crawlId} from active crawls`);
      }
      
      // Reorder the queue
      await this.reorderQueue();
      
      // Check if we need to start processing new items
      this.startProcessing();
    } catch (error) {
      console.error(`Error cancelling queued crawl ${crawlId}:`, error);
    }
  }

  async clearStuckCrawls() {
    try {
      console.log('Clearing stuck crawls...');
      
      // Find crawls that are stuck in 'in_progress' status
      const stuckCrawls = await Crawl.find({
        status: 'in_progress',
        updatedAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } // 30 minutes old
      });
      
      console.log(`Found ${stuckCrawls.length} stuck crawls`);
      
      // Reset their status to 'failed'
      for (const crawl of stuckCrawls) {
        console.log(`Resetting stuck crawl ${crawl._id}`);
        await Crawl.findByIdAndUpdate(crawl._id, {
          status: 'failed',
          completedAt: new Date()
        });
      }
      
      // Find crawls that are stuck in 'queued' status
      const stuckQueueItems = await Queue.find({
        status: 'queued',
        updatedAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } // 1 hour old
      });
      
      console.log(`Found ${stuckQueueItems.length} stuck queue items`);
      
      // Mark them as complete to remove from queue
      for (const item of stuckQueueItems) {
        console.log(`Resetting stuck queue item for crawl ${item.crawlId}`);
        item.status = 'completed';
        await item.save();
        
        // Also update the crawl status
        await Crawl.findByIdAndUpdate(item.crawlId, {
          status: 'failed',
          completedAt: new Date()
        });
      }
      
      // Clear any active crawls in the set that no longer exist
      const activeCrawlIds = Array.from(this.activeCrawls);
      for (const crawlId of activeCrawlIds) {
        const crawl = await Crawl.findById(crawlId);
        if (!crawl || crawl.status !== 'in_progress') {
          this.activeCrawls.delete(crawlId);
          console.log(`Removed stale active crawl ${crawlId}`);
        }
      }
      
      // Clean up any processing items
      const processingItems = await Queue.find({ status: 'processing' });
      for (const item of processingItems) {
        item.status = 'completed';
        await item.save();
        console.log(`Cleaned up processing queue item for crawl ${item.crawlId}`);
      }
      
      // Reorder the queue
      await this.reorderQueue();
      
      return {
        stuckCrawls: stuckCrawls.length,
        stuckQueueItems: stuckQueueItems.length,
        processingItems: processingItems.length
      };
    } catch (error) {
      console.error('Error clearing stuck crawls:', error);
      throw error;
    }
  }
}

module.exports = new QueueService(); 