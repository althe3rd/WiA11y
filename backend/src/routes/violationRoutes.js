const express = require('express');
const router = express.Router();
const Violation = require('../models/violation');
const { auth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// Get violations for a specific page in a scan
router.get('/:scanId/:url', async (req, res) => {
  try {
    console.log('Fetching violations for:', {
      scanId: req.params.scanId,
      url: decodeURIComponent(req.params.url)
    });

    const violations = await Violation.find({
      crawlId: req.params.scanId,
      url: decodeURIComponent(req.params.url)
    }).lean();

    console.log('Found violations:', violations.length);

    // Debug log to check what we're getting from the database
    console.log('Raw violations from DB:', JSON.stringify(violations.slice(0, 2), null, 2));

    // Group violations by rule
    const groupedViolations = violations.reduce((acc, violation) => {
      // Create a unique key combining id and help text to ensure uniqueness
      const violationKey = `${violation.id}-${violation.help}`;
      if (!acc[violationKey]) {
        acc[violationKey] = {
          id: violation.id,
          help: violation.help,
          description: violation.description,
          helpUrl: violation.helpUrl,
          impact: violation.impact,
          nodes: []
        };
      }
      acc[violationKey].nodes.push(...violation.nodes);
      return acc;
    }, {});

    // Debug log to check our grouped results
    console.log('Grouped violations:', Object.keys(groupedViolations).length, 'unique violations');

    res.json(Object.values(groupedViolations));
  } catch (error) {
    console.error('Error fetching page violations:', error);
    res.status(500).json({ error: 'Failed to fetch violations' });
  }
});

module.exports = router; 