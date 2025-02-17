const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { auth, isNetworkAdmin } = require('../middleware/auth');

// Get settings - public route
router.get('/', settingsController.getSettings);

// Protected routes require authentication and network admin role
router.use(auth);
router.use(isNetworkAdmin);

// Update settings
router.post('/', settingsController.updateSettings);

// Upload logo
router.post('/logo', settingsController.uploadLogo);

// Remove logo
router.delete('/logo', settingsController.removeLogo);

// Get email configuration
router.get('/email-config', settingsController.getEmailConfig);

// Test email configuration
router.post('/test-email', settingsController.sendTestEmail);

// Email preferences routes
router.get('/email-preferences', settingsController.getEmailPreferences);
router.post('/email-preferences', settingsController.updateEmailPreferences);
router.post('/send-report-now', settingsController.sendReportNow);

module.exports = router; 