const express = require('express');
const router = express.Router();
const Violation = require('../models/violation');
const { auth } = require('../middleware/auth');
const aiService = require('../services/aiService');

// Apply auth middleware to all routes
router.use(auth);

// Get violations for a specific page in a scan
router.get('/:scanId/:url', async (req, res) => {
  try {
    // Normalize URL by removing anchor fragments
    const decodedUrl = decodeURIComponent(req.params.url);
    const normalizedUrl = decodedUrl.split('#')[0];
    
    console.log('Fetching violations for:', {
      scanId: req.params.scanId,
      originalUrl: decodedUrl,
      normalizedUrl: normalizedUrl
    });

    const violations = await Violation.find({
      crawlId: req.params.scanId,
      url: normalizedUrl
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

// Generate AI remediation suggestion for a specific violation
router.post('/remediation-suggestion', async (req, res) => {
  try {
    const { id, help, description, node } = req.body;
    
    // Validate request
    if ((!id && !node._id) || !help || !node || !node.html) {
      return res.status(400).json({ error: 'Missing required violation data' });
    }

    console.log('Generating remediation suggestion for:', {
      id: id || 'region',
      help,
      descriptionLength: description?.length,
      nodeHtmlLength: node?.html?.length
    });

    // Generate remediation suggestion using AI
    const suggestion = await aiService.generateRemediationSuggestion({
      id: id || 'region', // If id is missing, use 'region' as fallback (based on the help text)
      help,
      description,
      node
    });

    console.log('Sending remediation suggestion response:', {
      suggestionLength: suggestion?.length,
      suggestionPreview: suggestion?.substring(0, 50) + '...'
    });

    res.json({ suggestion });
  } catch (error) {
    console.error('Error generating remediation suggestion:', error);
    res.status(500).json({ 
      error: 'Failed to generate remediation suggestion',
      message: error.message
    });
  }
});

module.exports = router; 