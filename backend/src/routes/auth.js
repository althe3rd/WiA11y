const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/user');

// Add the /me endpoint
router.get('/me', auth, async (req, res) => {
  try {
    console.log('GET /me request:', {
      userId: req.user?.id,
      headers: req.headers
    });

    // User is already attached to req by auth middleware
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      console.log('User not found:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Found user:', {
      id: user._id,
      email: user.email,
      role: user.role
    });

    res.json(user);
  } catch (error) {
    console.error('Error in /me endpoint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 