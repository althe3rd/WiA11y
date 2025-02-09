require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/user');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const users = await User.find({}, 'name email role');
    console.log('Users in database:', users);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit();
}

checkUsers(); 