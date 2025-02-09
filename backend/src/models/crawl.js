const mongoose = require('mongoose');

const crawlSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  depthLimit: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  pageLimit: {
    type: Number,
    required: true,
    min: 1,
    max: 1000
  },
  crawlRate: {
    type: Number,
    required: true,
    min: 1,
    max: 60
  },
  wcagVersion: {
    type: String,
    required: true,
    enum: ['2.0', '2.1', '2.2']
  },
  wcagLevel: {
    type: String,
    required: true,
    enum: ['A', 'AA', 'AAA']
  },
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
    default: 0
  },
  startedAt: Date,
  completedAt: Date,
}, {
  timestamps: true
});

// Add pre-save middleware to validate values
crawlSchema.pre('save', function(next) {
  next();
});

module.exports = mongoose.model('Crawl', crawlSchema); 