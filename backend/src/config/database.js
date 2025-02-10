const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined');
    }

    console.log('MongoDB URI check:');
    console.log('- Type:', typeof mongoUri);
    console.log('- Length:', mongoUri.length);
    console.log('- Starts with:', mongoUri.substring(0, 20) + '...');

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,  // Force IPv4
      ssl: true,
      authSource: 'admin',
      retryWrites: true,
      w: 'majority'
    };

    await mongoose.connect(mongoUri, options);
    console.log('MongoDB Connected Successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB; 