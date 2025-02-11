const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/user');

// GET /api/auth/me - Get current user
router.get('/me', auth, async (req, res) => {
  try {
    console.log('GET /me request received');
    
    // User should be attached by auth middleware
    if (!req.user) {
      console.log('No user found in request');
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Get fresh user data from database
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('teams', 'name');

    if (!user) {
      console.log('User not found in database:', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Returning user data:', {
      id: user._id,
      email: user.email,
      role: user.role,
      teamsCount: user.teams?.length
    });

    res.json(user);
  } catch (error) {
    console.error('Error in /me endpoint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 