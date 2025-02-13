const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['network_admin', 'admin', 'team_admin', 'team_member', 'user'],
    default: 'team_member'
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

// Add any pre-save hooks or methods here

const User = mongoose.model('User', userSchema);

module.exports = User; 