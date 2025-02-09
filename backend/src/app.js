const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const teamRoutes = require('./routes/teamRoutes');
const crawlRoutes = require('./routes/crawlRoutes');
const violationRoutes = require('./routes/violationRoutes');
const proxyRoutes = require('./routes/proxyRoutes');

const app = express();

// Load environment variables based on NODE_ENV
console.log('Current NODE_ENV:', process.env.NODE_ENV);
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';
console.log('Loading environment from:', envFile);
console.log('Current directory:', process.cwd());
console.log('Env file exists:', require('fs').existsSync(envFile));

require('dotenv').config({
  path: require('path').resolve(__dirname, '..', envFile)
});

// Force set the MongoDB URI if it's not being loaded correctly
if (process.env.NODE_ENV === 'production') {
  process.env.MONGODB_URI = 'mongodb+srv://wia11y_admin:ZZyTkJrL34javvag@wia11y.wpyxo.mongodb.net/?retryWrites=true&w=majority&appName=WiA11y';
}

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

// Connect to MongoDB
console.log('Attempting to connect to MongoDB Atlas:', process.env.MONGODB_URI);
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error('MONGODB_URI is not defined');
}
console.log('Using MongoDB URI:', mongoUri.substring(0, 20) + '...');

mongoose.connect(mongoUri, {
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  ssl: true,
  authSource: 'admin',
  dbName: 'accessibility-scanner'
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
  if (err.name === 'MongoServerSelectionError') {
    console.error('Failed to connect to MongoDB server. Please check:');
    console.error('1. MongoDB URI is correct');
    console.error('2. Network access is allowed for IP:', process.env.SERVER_IP);
    console.error('3. Database user has correct permissions');
  }
});

module.exports = app; 