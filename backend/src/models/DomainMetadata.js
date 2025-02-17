const mongoose = require('mongoose');

const domainMetadataSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure unique domain per team
domainMetadataSchema.index({ domain: 1, team: 1 }, { unique: true });

module.exports = mongoose.model('DomainMetadata', domainMetadataSchema); 