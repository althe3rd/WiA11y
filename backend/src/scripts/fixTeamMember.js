require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Team = require('../models/team');
const User = require('../models/user');

async function fixTeamMember() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find Jessie
    const user = await User.findOne({ email: 'jessie.nemec@gmail.com' });
    if (!user) {
      console.log('User not found');
      return;
    }
    
    // Find Libraries team
    const team = await Team.findOne({ name: 'Libraries' });
    if (!team) {
      console.log('Team not found');
      return;
    }

    console.log('Before update:');
    console.log('Team members:', team.members);
    console.log('Team admins:', team.teamAdmins);
    
    // Add Jessie as a team admin
    const updatedTeam = await Team.findByIdAndUpdate(
      team._id,
      { $addToSet: { teamAdmins: user._id } },
      { new: true }
    );

    console.log('After update:');
    console.log('Team members:', updatedTeam.members);
    console.log('Team admins:', updatedTeam.teamAdmins);
    
    // Make sure user has team reference
    await User.findByIdAndUpdate(
      user._id,
      { $addToSet: { teams: team._id } }
    );
    
    console.log('Fixed team membership for Jessie');
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit();
}

fixTeamMember(); 