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
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Crawl', crawlSchema); 