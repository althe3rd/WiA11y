const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, isAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const emailService = require('../services/emailService');

console.log('Setting up user routes');

// Public routes
router.post('/register', async (req, res, next) => {
  try {
    console.log('Register route hit');
    await userController.register(req, res);
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', {
      email: req.body.email,
      hasPassword: !!req.body.password,
      jwtSecret: process.env.JWT_SECRET?.substring(0, 5) + '...' // Show first 5 chars
    });
    
    const user = await User.findOne({ email: req.body.email });
    console.log('User found:', !!user);
    
    if (!user) {
      console.log('No user found with email:', req.body.email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('Stored password hash:', user.password);
    const isValidPassword = await bcrypt.compare(req.body.password, user.password);
    console.log('Password comparison result:', isValidPassword);

    if (!isValidPassword) {
      console.log('Invalid password for user:', req.body.email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    console.log('Token generated:', !!token);

    res.json({ user, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/create', auth, async (req, res, next) => {
  try {
    await userController.createUser(req, res);
  } catch (error) {
    next(error);
  }
});

// Protected routes
router.get('/search', auth, async (req, res, next) => {
  try {
    await userController.searchUsers(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/profile', auth, async (req, res, next) => {
  try {
    await userController.getProfile(req, res);
  } catch (error) {
    next(error);
  }
});

// Admin routes
router.patch('/promote/:userId', auth, isAdmin, async (req, res, next) => {
  try {
    await userController.promoteUser(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/all', auth, isAdmin, async (req, res, next) => {
  try {
    await userController.getAllUsers(req, res);
  } catch (error) {
    next(error);
  }
});

router.patch('/:userId', auth, userController.updateUser);
router.delete('/:userId', auth, userController.deleteUser);

// Add these routes with the other public routes
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Forgot password request for email:', email);

    // Add debug logging for all users with explicit fields
    const allUsers = await User.find({}, 'email name _id').lean();
    console.log('Raw users from DB:', allUsers);

    // Try both exact match and case-insensitive search
    const exactUser = await User.findOne({ email });
    const caseInsensitiveUser = await User.findOne({ 
      email: { 
        $regex: new RegExp(`^${email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') 
      } 
    });

    console.log('Search results:', {
      exactMatch: !!exactUser,
      caseInsensitive: !!caseInsensitiveUser,
      searchedEmail: email,
      foundExactEmail: exactUser?.email,
      foundCaseInsensitiveEmail: caseInsensitiveUser?.email
    });

    const user = exactUser || caseInsensitiveUser;
    
    if (!user) {
      console.log('No user found with email:', email);
      return res.json({ message: 'If an account exists, a reset link will be sent' });
    }

    console.log('Generating reset token for user:', user._id);
    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Store reset token and expiry
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    console.log('Reset token saved to user');

    // Send the reset email
    console.log('Attempting to send reset email...');
    await emailService.sendPasswordResetEmail(email, resetToken);
    console.log('Reset email sent successfully');

    res.json({ 
      message: 'Reset instructions sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password successfully reset' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.get('/count', userController.getUserCount);

module.exports = router; 