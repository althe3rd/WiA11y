const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
  crawlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crawl',
    required: true
  },
  url: {
    type: String,
    required: true
  },
  impact: {
    type: String,
    enum: ['critical', 'serious', 'moderate', 'minor'],
    required: true
  },
  description: String,
  help: String,
  helpUrl: String,
  nodes: [{
    html: String,
    target: [String],
    failureSummary: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Violation', violationSchema); 