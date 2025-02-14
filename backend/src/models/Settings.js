const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  primaryColor: {
    type: String,
    default: '#7055A4',
    validate: {
      validator: function(v) {
        return /^#[0-9A-Fa-f]{6}$/.test(v);
      },
      message: 'Primary color must be a valid hex color code'
    }
  },
  secondaryColor: {
    type: String,
    default: '#0579A9',
    validate: {
      validator: function(v) {
        return /^#[0-9A-Fa-f]{6}$/.test(v);
      },
      message: 'Secondary color must be a valid hex color code'
    }
  },
  logo: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema); 