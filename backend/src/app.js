const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/mongodb');
const userRoutes = require('./routes/userRoutes');
const teamRoutes = require('./routes/teamRoutes');
const crawlRoutes = require('./routes/crawlRoutes');
const violationRoutes = require('./routes/violationRoutes');
const proxyRoutes = require('./routes/proxyRoutes');

// Debug environment variables at startup
console.log('==== Application Startup ====');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('All environment variables:', {
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI ? 'exists' : 'missing',
  CORS_ORIGIN: process.env.CORS_ORIGIN,
});

const app = express();

// Debug environment after loading
console.log('Environment check:');
console.log('- PORT:', process.env.PORT);
console.log('- CORS_ORIGIN:', process.env.CORS_ORIGIN);
console.log('- MONGODB_URI type:', typeof process.env.MONGODB_URI);
console.log('- MONGODB_URI starts with:', process.env.MONGODB_URI?.substring(0, 20) + '...');
console.log('- MONGODB_URI includes "mongodb+srv":', process.env.MONGODB_URI?.includes('mongodb+srv'));
console.log('- MONGODB_URI length:', process.env.MONGODB_URI?.length);
console.log('- Full env file path:', require('path').resolve(envFile));

// Middleware
app.use(cors());
app.use(express.json());

// Add before routes
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
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

// Initialize database connection
connectDB()
  .then(() => {
    console.log('Database connection established');
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

module.exports = app; 