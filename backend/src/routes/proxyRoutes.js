const express = require('express');
const router = express.Router();
const proxyService = require('../services/proxyService');
const jwt = require('jsonwebtoken');

router.get('/:encodedUrl', async (req, res) => {
  try {
    const url = decodeURIComponent(req.params.encodedUrl);
    // Verify token from query parameter for iframe requests
    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      // Verify the token
      // Remove 'Bearer ' if present
      const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
      jwt.verify(tokenValue, process.env.JWT_SECRET);
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const modifiedHtml = await proxyService.fetchAndModifyPage(url);
    
    // Set headers to allow iframe embedding from both development and production domains
    const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:8080'];
    res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${allowedOrigins.join(' ')}`);
    res.removeHeader('X-Frame-Options');
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    res.send(modifiedHtml);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy page' });
  }
});

module.exports = router; 