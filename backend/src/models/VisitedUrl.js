const mongoose = require('mongoose');

const visitedUrlSchema = new mongoose.Schema({
  crawlId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crawl', required: true },
  url: { type: String, required: true, index: true }, // Index for performance
  createdAt: { type: Date, default: Date.now }
});

// Add a compound index for faster lookups
visitedUrlSchema.index({ crawlId: 1, url: 1 }, { unique: true });

module.exports = mongoose.model('VisitedUrl', visitedUrlSchema); 