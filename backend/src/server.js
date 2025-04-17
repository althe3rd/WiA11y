const mongoose = require('mongoose');
const app = require('./app');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const CrawlerService = require('./services/crawlerService');
const schedulerService = require('./services/schedulerService');

const execAsync = util.promisify(exec);

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

// Add this before the mongoose.connect call
const dbName = process.env.NODE_ENV === 'production' 
  ? 'accessibility-crawler'
  : 'accessibility-crawler-dev';

// Connect with debug logging
mongoose.connect(process.env.MONGODB_URI, {
  dbName: dbName  // Explicitly set the database name
})
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
async function cleanupTempDirs() {
  const tempDir = path.join(os.tmpdir(), 'wia11y');
  
  try {
    // Kill any existing Chrome processes
    if (process.platform === 'linux') {
      try {
        await execAsync('pkill -f chrome');
        console.log('Killed existing Chrome processes');
      } catch (error) {
        // Ignore errors
      }
    }

    if (fs.existsSync(tempDir)) {
      console.log('Cleaning up WiA11y temp directory:', tempDir);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    // Create with permissive permissions
    fs.mkdirSync(tempDir, { recursive: true, mode: 0o777 });
    console.log('Created WiA11y temp directory with permissions:', tempDir);
  } catch (error) {
    console.error('Error managing temp directories:', error);
  }
}

// Add before starting the server
cleanupTempDirs();

const port = process.env.PORT || 3000;

// After MongoDB connection setup
async function initializeServices() {
  try {
    if (process.env.NODE_ENV === 'production') {
      const crawlerService = new CrawlerService();
      await crawlerService.ensureTempfsDirectory();
      // Start the scheduler service
      schedulerService.start();
      console.log('Production services initialized successfully');
    } else {
      // In development, just ensure the temp directory exists
      const tempDir = path.join(os.tmpdir(), 'wia11y');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      fs.chmodSync(tempDir, 0o777);
      // Start the scheduler service in development too
      schedulerService.start();
      console.log('Development services initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing services:', error);
    process.exit(1);
  }
}

// Call it before starting the server
initializeServices().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}); 