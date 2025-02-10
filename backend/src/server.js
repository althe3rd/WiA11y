const mongoose = require('mongoose');

// Add connection error handling
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Add connection success handling
mongoose.connection.once('open', () => {
  console.log('MongoDB connected successfully');
});

// Remove hardcoded connection string and use environment variable
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).catch(error => {
  console.error('MongoDB connection failed:', error);
}); 