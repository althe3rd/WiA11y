const jwt = require('jsonwebtoken');
const User = require('../models/user');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Check if it's a Bearer token
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get full user info from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Add complete user object to request
    req.user = user;
    
    console.log('Auth middleware:', {
      token: token.substring(0, 20) + '...',
      userId: user._id,
      role: user.role,
      teams: user.teams
    });

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    if (!['network_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(403).json({ error: 'Not authorized' });
  }
};

const isNetworkAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'network_admin') {
      return res.status(403).json({ error: 'Network admin access required' });
    }
    next();
  } catch (error) {
    res.status(403).json({ error: 'Not authorized' });
  }
};

const isTeamAdmin = async (req, res, next) => {
  try {
    if (!['network_admin', 'admin', 'team_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Team admin access required' });
    }
    next();
  } catch (error) {
    res.status(403).json({ error: 'Not authorized' });
  }
};

module.exports = { auth, isAdmin, isNetworkAdmin, isTeamAdmin }; 