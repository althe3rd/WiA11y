/**
 * Script to clear stuck crawls from the queue
 * Run with: node src/scripts/clearStuckCrawls.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const queueService = require('../services/queueService');

async function clearStuckCrawls() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Clear stuck crawls
    const result = await queueService.clearStuckCrawls();
    
    console.log('Stuck crawls cleared successfully:');
    console.log('- Stuck in-progress crawls:', result.stuckCrawls);
    console.log('- Stuck queue items:', result.stuckQueueItems);
    console.log('- Processing items:', result.processingItems);
    
  } catch (error) {
    console.error('Error clearing stuck crawls:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
}

// Run the function
clearStuckCrawls(); 