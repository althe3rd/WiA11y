const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crawlController = require('./controllers/crawlController');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/accessibility-crawler', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Accessibility Crawler API' });
});

// Routes
app.get('/api/crawls', crawlController.getCrawls);
app.post('/api/crawls', crawlController.createCrawl);
app.post('/api/crawls/:id/cancel', crawlController.cancelCrawl);
app.delete('/api/crawls/:id', crawlController.deleteCrawl);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 