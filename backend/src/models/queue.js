const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  crawlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crawl',
    required: true
  },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued'
  },
  position: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add index for position to ensure proper ordering
queueSchema.index({ position: 1 });

module.exports = mongoose.model('Queue', queueSchema); 