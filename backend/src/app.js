console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Loading config from:', process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development');
console.log('MONGODB_URI:', process.env.MONGODB_URI);

require('dotenv').config({
  path: process.env.NODE_ENV === 'production' 
    ? '.env.production'
    : '.env.development'
});
const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const teamRoutes = require('./routes/teamRoutes');
const crawlRoutes = require('./routes/crawlRoutes');
const violationRoutes = require('./routes/violationRoutes');
const proxyRoutes = require('./routes/proxyRoutes');
const emailService = require('./services/emailService');
const authRoutes = require('./routes/auth');

const app = express();

// Log environment variables for debugging
console.log('Loading environment:', process.env.NODE_ENV);
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI
});

// Update CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    console.log('Request origin:', origin);
    console.log('Allowed origin:', process.env.CORS_ORIGIN);
    
    // For development, allow localhost:8080
    const allowedOrigins = [process.env.CORS_ORIGIN, 'http://localhost:8080'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Add before routes
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    path: req.path,
    headers: req.headers
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