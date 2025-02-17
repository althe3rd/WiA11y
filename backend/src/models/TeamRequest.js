const mongoose = require('mongoose');

const teamRequestSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['create', 'join'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    // Only required for join requests
    required: function() {
      return this.type === 'join';
    }
  },
  // For team creation requests
  teamName: {
    type: String,
    required: function() {
      return this.type === 'create';
    }
  },
  teamDescription: {
    type: String,
    required: function() {
      return this.type === 'create';
    }
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('TeamRequest', teamRequestSchema); 