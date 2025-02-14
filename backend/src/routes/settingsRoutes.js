const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const auth = require('../middleware/auth');
const networkAdminAuth = require('../middleware/networkAdminAuth');

// All routes require authentication and network admin role
router.use(auth);
router.use(networkAdminAuth);

// Get settings
router.get('/', settingsController.getSettings);

// Update settings
router.post('/', settingsController.updateSettings);

// Upload logo
router.post('/logo', settingsController.uploadLogo);

module.exports = router; 