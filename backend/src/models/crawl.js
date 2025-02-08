const mongoose = require('mongoose');

const crawlSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true,
  },
  crawlRate: {
    type: Number,
    required: true,
    min: 1,
    max: 60
  },
  wcagVersion: {
    type: String,
    enum: ['2.1', '2.2'],
    default: '2.1'
  },
  wcagLevel: {
    type: String,
    enum: ['A', 'AA', 'AAA'],
    default: 'AA'
  },
  depthLimit: {
    type: Number,
    required: true,
    min: 1,
    max: 20,
  },
  pageLimit: {
    type: Number,
    required: true,
    min: 1,
    max: 1000,
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  startedAt: Date,
  completedAt: Date,
  pagesScanned: {
    type: Number,
    default: 0
  },
  violationsFound: {
    type: Number,
    default: 0
  },
  violationsByImpact: {
    critical: { type: Number, default: 0 },
    serious: { type: Number, default: 0 },
    moderate: { type: Number, default: 0 },
    minor: { type: Number, default: 0 }
  },
  accessibilityScore: {
    type: Number,
    default: 100  // Start at 100% and deduct based on violations
  }
}, {
  timestamps: true
});

// Add pre-save middleware to validate values
crawlSchema.pre('save', function(next) {
  console.log('Saving crawl with values:', this.toObject());
  next();
});

module.exports = mongoose.model('Crawl', crawlSchema); 