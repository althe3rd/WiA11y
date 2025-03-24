const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  primaryColor: {
    type: String,
    default: '#388fec',
    validate: {
      validator: function(v) {
        return /^#[0-9A-Fa-f]{6}$/.test(v);
      },
      message: 'Primary color must be a valid hex color code'
    }
  },
  secondaryColor: {
    type: String,
    default: '#FF006E',
    validate: {
      validator: function(v) {
        return /^#[0-9A-Fa-f]{6}$/.test(v);
      },
      message: 'Secondary color must be a valid hex color code'
    }
  },
  title: {
    type: String,
    default: 'WiA11y',
    trim: true,
    maxLength: 50
  },
  logo: {
    type: String,
    default: null
  },
  useDefaultLogo: {
    type: Boolean,
    default: true
  },
  maxCrawlers: {
    type: Number,
    default: 1,
    min: 1,
    max: 10,
    validate: {
      validator: function(v) {
        return Number.isInteger(v) && v > 0 && v <= 10;
      },
      message: 'Max crawlers must be an integer between 1 and 10'
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema); 