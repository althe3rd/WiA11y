const mongoose = require('mongoose');

const emailPreferencesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  enabled: {
    type: Boolean,
    default: false
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'weekly'
  },
  lastSent: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Ensure one preference set per user
emailPreferencesSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('EmailPreferences', emailPreferencesSchema); 