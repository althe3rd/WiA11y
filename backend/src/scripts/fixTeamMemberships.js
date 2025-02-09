require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Team = require('../models/team');
const User = require('../models/user');

console.log('MongoDB URI:', process.env.MONGODB_URI);

async function fixTeamMemberships() {
  try {
    // Get all teams
    const teams = await Team.find();
    
    // For each team
    for (const team of teams) {
      // Update all members
      if (team.members.length) {
        await User.updateMany(
          { _id: { $in: team.members } },
          { $addToSet: { teams: team._id } }
        );
      }
      
      // Update all admins
      if (team.teamAdmins.length) {
        await User.updateMany(
          { _id: { $in: team.teamAdmins } },
          { $addToSet: { teams: team._id } }
        );
      }
    }
    
    console.log('Team memberships fixed');
  } catch (error) {
    console.error('Error fixing team memberships:', error);
  }
  process.exit();
}

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Connect to MongoDB and run the fix
mongoose.connect(process.env.MONGODB_URI)
  .then(fixTeamMemberships)
  .catch(console.error); 