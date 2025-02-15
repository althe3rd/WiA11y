console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Loading config from:', process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development');
console.log('MONGODB_URI:', process.env.MONGODB_URI);

require('dotenv').config({
  path: process.env.NODE_ENV === 'production' 
    ? '.env.production'
    : '.env.development'
});
const cors = require('cors');
const express = require('express');
const userRoutes = require('./routes/userRoutes');
const teamRoutes = require('./routes/teamRoutes');
const crawlRoutes = require('./routes/crawlRoutes');
const violationRoutes = require('./routes/violationRoutes');
const proxyRoutes = require('./routes/proxyRoutes');
const emailService = require('./services/emailService');
const authRoutes = require('./routes/auth');
const queueRoutes = require('./routes/queueRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const path = require('path');
const fs = require('fs').promises;

const app = express();

// Ensure uploads directories exist
(async () => {
  try {
    await fs.mkdir(path.join(__dirname, '../uploads/logos'), { recursive: true });
    console.log('Uploads directories created successfully');
  } catch (error) {
    console.error('Error creating uploads directories:', error);
  }
})();

// Log environment variables for debugging
console.log('Loading environment:', process.env.NODE_ENV);
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI
});

// CORS Configuration
const allowedOrigins = [
  'https://wia11y.netlify.app',
  'http://localhost:8080',
  'http://localhost:3000'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    headers: {
      authorization: req.headers.authorization ? 'present' : 'missing',
      origin: req.headers.origin
    }
  });
  next();
});

console.log('Setting up routes...');
// Mount routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Accessibility Crawler API' });
});

app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/crawls', crawlRoutes);
app.use('/api/violations', violationRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/settings', settingsRoutes);

// Serve uploaded files from the root uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Add 404 handler
app.use((req, res) => {
  console.log('404 Not Found:', req.method, req.url);
  res.status(404).json({ error: 'Not Found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Verify email service connection
emailService.verifyConnection()
  .then(isReady => {
    if (isReady) {
      console.log('Email service is configured and ready');
    } else {
      console.error('Email service is not ready');
    }
  })
  .catch(error => {
    console.error('Failed to verify email service:', error);
  });

module.exports = app; 