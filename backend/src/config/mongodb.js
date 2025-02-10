const { MongoClient } = require('mongodb');

let db = null;

const connectDB = async () => {
  try {
    const uri = process.env.NODE_ENV === 'production' 
      ? 'mongodb+srv://wia11y_admin:ZZyTkJrL34javvag@wia11y.wpyxo.mongodb.net/?retryWrites=true&w=majority&appName=WiA11y'
      : process.env.MONGODB_URI;

    console.log('Connecting to MongoDB...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('URI starts with:', uri.substring(0, 20) + '...');

    const client = new MongoClient(uri, {
      ssl: true,
      tls: true,
      family: 4,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    await client.connect();
    db = client.db('accessibility-scanner');
    console.log('MongoDB Connected Successfully');
    return db;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
};

module.exports = { connectDB, getDB }; 