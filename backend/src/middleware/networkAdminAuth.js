const networkAdminAuth = (req, res, next) => {
  if (req.user && req.user.role === 'network_admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Network admin role required.' });
  }
};

module.exports = networkAdminAuth; 