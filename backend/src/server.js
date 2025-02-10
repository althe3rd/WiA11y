const mongoose = require('mongoose');
const app = require('./app');

const port = process.env.PORT || 3000;

// Add connection error handling
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Add connection success handling
mongoose.connection.once('open', () => {
  console.log('MongoDB connected successfully');
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).catch(error => {
  console.error('MongoDB connection failed:', error);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 