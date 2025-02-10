const mongoose = require('mongoose');
const app = require('./app');

// Add connection debugging
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected to:', mongoose.connection.name);
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Connect with debug logging
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connection successful');
    // Log database stats
    return mongoose.connection.db.stats();
  })
  .then((stats) => {
    console.log('Database stats:', {
      database: mongoose.connection.name,
      collections: stats.collections,
      objects: stats.objects
    });
    // List all collections
    return mongoose.connection.db.listCollections().toArray();
  })
  .then((collections) => {
    console.log('Collections:', collections.map(c => c.name));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 