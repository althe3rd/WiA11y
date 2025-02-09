require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/user');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const email = 'your.email@example.com'; // Replace with the user's email
    const newPassword = 'newpassword123'; // Replace with desired password
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await User.findOneAndUpdate(
      { email },
      { password: hashedPassword },
      { new: true }
    );
    
    if (result) {
      console.log('Password reset successful for user:', result.email);
    } else {
      console.log('User not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit();
}

resetPassword(); 