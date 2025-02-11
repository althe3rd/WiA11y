const jwt = require('jsonwebtoken');
const User = require('../models/user');

const auth = async (req, res, next) => {
  try {
    console.log('Auth middleware processing request:', {
      path: req.path,
      method: req.method,
      hasAuthHeader: !!req.header('Authorization')
    });

    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified:', { userId: decoded.userId });

    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log('User not found:', decoded.userId);
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
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