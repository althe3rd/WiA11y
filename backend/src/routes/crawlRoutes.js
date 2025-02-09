const express = require('express');
const router = express.Router();
const crawlController = require('../controllers/crawlController');
const { auth } = require('../middleware/auth');

console.log('Setting up crawl routes');

// All crawl routes require authentication
router.use(auth);

// Get crawls (filtered by team/user unless network admin)
router.get('/', crawlController.getCrawls);

// Create new crawl
router.post('/', crawlController.createCrawl);

// Cancel crawl
router.post('/:id/cancel', crawlController.cancelCrawl);

// Delete crawl
router.delete('/:id', crawlController.deleteCrawl);

module.exports = router; 