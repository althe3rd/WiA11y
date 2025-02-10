const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    // Force the production URI if not set
    if (!mongoUri && process.env.NODE_ENV === 'production') {
      console.log('MONGODB_URI not found, using hardcoded production URI');
      process.env.MONGODB_URI = 'mongodb+srv://wia11y_admin:ZZyTkJrL34javvag@wia11y.wpyxo.mongodb.net/?retryWrites=true&w=majority&appName=WiA11y';
    }

    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined');
    }

    console.log('MongoDB URI check:');
    console.log('- Type:', typeof mongoUri);
    console.log('- Length:', mongoUri.length);
    console.log('- Starts with:', mongoUri.substring(0, 20) + '...');
    console.log('- Full URI:', mongoUri); // Temporarily log full URI for debugging

    // Try direct MongoDB connection first
    console.log('Attempting direct MongoDB connection...');
    const client = new MongoClient(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      tls: true,
      ssl: true
    });
    
    await client.connect();
    console.log('Direct MongoDB connection successful');
    await client.close();

    // Now try Mongoose connection
    console.log('Attempting Mongoose connection...');

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increase timeout
      socketTimeoutMS: 45000,
      family: 4,  // Force IPv4
      ssl: true,
      tls: true,
      authSource: 'admin',
      retryWrites: true,
      w: 'majority',
      directConnection: false,
      dbName: 'accessibility-scanner'
    };

    // Try parsing the URI to validate it
    try {
      const url = new URL(mongoUri);
      console.log('Parsed MongoDB URL:');
      console.log('- Protocol:', url.protocol);
      console.log('- Host:', url.host);
      console.log('- Pathname:', url.pathname);
      console.log('- Search params:', url.searchParams.toString());
    } catch (parseError) {
      console.error('Failed to parse MongoDB URI:', parseError);
    }

    await mongoose.connect(mongoUri, options);
    console.log('MongoDB Connected Successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    if (err.name === 'MongoServerSelectionError') {
      console.error('Connection details:');
      console.error('- Node version:', process.version);
      console.error('- Mongoose version:', mongoose.version);
      console.error('- MongoDB driver version:', mongoose.mongo.version);
      console.error('- Environment:', process.env.NODE_ENV);
    }
    process.exit(1);
  }
};

module.exports = connectDB; 