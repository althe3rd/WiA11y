const mongoose = require('mongoose');

// Add connection error handling
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Add connection success handling
mongoose.connection.once('open', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connect('mongodb://localhost:27017/accessibility-crawler', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).catch(error => {
  console.error('MongoDB connection failed:', error);
}); 