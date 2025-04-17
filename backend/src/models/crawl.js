const mongoose = require('mongoose');

const crawlSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true
  },
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
    enum: ['pending', 'queued', 'in_progress', 'completed', 'failed', 'cancelled'],
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
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  currentUrl: String,
  queuePosition: {
    type: Number,
    default: null
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  scheduleFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'weekly'
  },
  nextScheduledRun: {
    type: Date,
    default: null
  },
  parentCrawlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crawl',
    default: null
  }
}, {
  timestamps: true
});

crawlSchema.pre('save', function(next) {
  if (this.isScheduled && !this.nextScheduledRun) {
    const now = new Date();
    
    switch (this.scheduleFrequency) {
      case 'daily':
        this.nextScheduledRun = new Date(now.setDate(now.getDate() + 1));
        break;
      case 'weekly':
        this.nextScheduledRun = new Date(now.setDate(now.getDate() + 7));
        break;
      case 'monthly':
        this.nextScheduledRun = new Date(now.setMonth(now.getMonth() + 1));
        break;
      default:
        this.nextScheduledRun = new Date(now.setDate(now.getDate() + 7));
    }
  }
  next();
});

module.exports = mongoose.model('Crawl', crawlSchema); 