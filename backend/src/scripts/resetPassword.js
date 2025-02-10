require('dotenv').config({
  path: process.env.NODE_ENV === 'production' 
    ? '.env.production'
    : '.env.development'
});

const mongoose = require('mongoose');
const User = require('../models/user');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  try {
    // Get email from command line argument
    const email = process.argv[2];
    if (!email) {
      console.error('Please provide an email address');
      console.log('Usage: node resetPassword.js <email>');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return;
    }

    const newPassword = 'm816l931s09';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ email }, { password: hashedPassword });
    
    console.log('Password reset successfully for:', email);
    console.log('New password:', newPassword);

  } catch (error) {
    console.error('Error:', error);
  }
  process.exit();
}

resetPassword(); 