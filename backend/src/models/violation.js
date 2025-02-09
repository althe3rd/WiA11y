const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
  crawlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crawl',
    required: true
  },
  id: String,
  impact: {
    type: String,
    enum: ['critical', 'serious', 'moderate', 'minor']
  },
  description: String,
  help: String,
  helpUrl: String,
  url: String,
  nodes: [{
    html: String,
    target: [String],
    failureSummary: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Violation', violationSchema); 