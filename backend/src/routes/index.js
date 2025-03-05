const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const teamRoutes = require('./teamRoutes');
const crawlRoutes = require('./crawlRoutes');
const queueRoutes = require('./queueRoutes');
const settingsRoutes = require('./settingsRoutes');
const violationRoutes = require('./violationRoutes');
const proxyRoutes = require('./proxyRoutes');

// Serve uploaded files
router.use('/uploads', express.static('uploads'));

router.use('/api/users', userRoutes);
router.use('/api/teams', teamRoutes);
router.use('/api/crawls', crawlRoutes);
router.use('/api/queue', queueRoutes);
router.use('/api/settings', settingsRoutes);
router.use('/api/violations', violationRoutes);
router.use('/api/proxy', proxyRoutes);

module.exports = router; 