const mongoose = require('mongoose');
const app = require('./app');
const os = require('os');
const fs = require('fs');
const path = require('path');

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
    console.log('Connected to database:', mongoose.connection.db.databaseName);
    // Log database stats
    return mongoose.connection.db.stats();
  })
  .then((stats) => {
    console.log('Database stats:', {
      database: mongoose.connection.name,
      databaseName: mongoose.connection.db.databaseName,
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

// Add this before starting the server
function cleanupTempDirs() {
  const tempDir = os.tmpdir();
  const files = fs.readdirSync(tempDir);
  
  files.forEach(file => {
    if (file.startsWith('wia11y-')) {
      const fullPath = path.join(tempDir, file);
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log('Cleaned up temp directory:', fullPath);
      } catch (error) {
        console.error('Error cleaning temp directory:', error);
      }
    }
  });
}

// Add before starting the server
cleanupTempDirs();

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 