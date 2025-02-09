const jwt = require('jsonwebtoken');
const User = require('../models/user');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
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
    if (!['network_admin', 'admin', 'team_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Team admin access required' });
    }
    next();
  } catch (error) {
    res.status(403).json({ error: 'Not authorized' });
  }
};

module.exports = { auth, isAdmin, isNetworkAdmin, isTeamAdmin }; 