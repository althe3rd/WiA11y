const Queue = require('../models/queue');
const Crawl = require('../models/crawl');
const crawlerService = require('./crawlerServiceInstance');

class QueueService {
  constructor() {
    this.isProcessing = false;
    this.processingTimeout = null;
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

  async processQueue() {
    if (this.isProcessing) return;
    
    try {
      this.isProcessing = true;
      this.processingTimeout = null;

      while (true) {
        // Get next item in queue
        const nextItem = await Queue.findOne({
          status: 'queued'
        }).sort({ position: 1 });

        if (!nextItem) {
          break; // No more items to process
        }

        // Double check that this item isn't already being processed
        const crawl = await Crawl.findById(nextItem.crawlId);
        if (crawl.status === 'in_progress') {
          // Skip this item and move to next
          nextItem.status = 'completed';
          await nextItem.save();
          continue;
        }

        // Update status to processing
        nextItem.status = 'processing';
        await nextItem.save();

        // Update crawl status
        await Crawl.findByIdAndUpdate(nextItem.crawlId, {
          status: 'in_progress',
          startedAt: new Date()
        });

        try {
          // Process the crawl
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
        }

        // Reorder remaining queue items
        await this.reorderQueue();
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.isProcessing = false;
      // Check if there are more items to process
      const pendingItems = await Queue.findOne({ status: 'queued' });
      if (pendingItems) {
        this.startProcessing();
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
}

module.exports = new QueueService(); 