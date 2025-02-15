const jwt = require('jsonwebtoken');
const User = require('../models/user');

const auth = async (req, res, next) => {
  try {
    console.log('Auth middleware processing request:', {
      path: req.path,
      method: req.method,
      hasAuthHeader: !!req.header('Authorization'),
      authHeader: req.header('Authorization')
    });

    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ error: 'Please authenticate' });
    }

    console.log('Token received:', token.substring(0, 20) + '...');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully:', decoded);

    const user = await User.findOne({ _id: decoded.userId });

    if (!user) {
      console.log('No user found for token');
      throw new Error();
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Please authenticate' });
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
    if (!['network_admin', 'team_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Team admin access required' });
    }
    next();
  } catch (error) {
    res.status(403).json({ error: 'Not authorized' });
  }
};

module.exports = {
  auth,
  isAdmin,
  isNetworkAdmin,
  isTeamAdmin
}; 