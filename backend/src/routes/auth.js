const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

// Add this at the top of your auth routes
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    routes: router.stack
      .filter(r => r.route)
      .map(r => ({
        path: r.route.path,
        methods: Object.keys(r.route.methods)
      }))
  });
});

// Login route
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', {
      email: req.body.email,
      headers: req.headers,
      origin: req.get('origin')
    });

    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log('Login successful:', {
      userId: user._id,
      email: user.email,
      role: user.role
    });

    // Send response
    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        teams: user.teams
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router; 