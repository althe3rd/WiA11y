require('dotenv').config({
  path: process.env.NODE_ENV === 'production' 
    ? '.env.production'
    : '.env.development'
});

const mongoose = require('mongoose');
const User = require('../models/user');
const bcrypt = require('bcryptjs');

async function createUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const userData = {
      email: 'al.nemec@gmail.com',
      password: 'm816l931s09',
      name: 'Al Nemec',
      role: 'network_admin'  // Set as network admin
    };

    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      console.log('User already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Create user
    const user = new User({
      ...userData,
      password: hashedPassword
    });

    await user.save();
    console.log('User created successfully:', user.email);

  } catch (error) {
    console.error('Error:', error);
  }
  process.exit();
}

createUser(); 