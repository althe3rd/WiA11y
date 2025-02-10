require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Team = require('../models/team');
const User = require('../models/user');

async function checkTeamRelations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get all teams
    const teams = await Team.find().populate('members teamAdmins', 'name email');
    
    console.log('\nTeam Memberships:');
    for (const team of teams) {
      console.log(`\nTeam: ${team.name}`);
      console.log('Members:', team.members.map(m => ({ id: m._id, name: m.name, email: m.email })));
      console.log('Admins:', team.teamAdmins.map(a => ({ id: a._id, name: a.name, email: a.email })));
      
      // Fix user references
      for (const member of team.members) {
        await User.findByIdAndUpdate(
          member._id,
          { $addToSet: { teams: team._id } }
        );
      }
      
      for (const admin of team.teamAdmins) {
        await User.findByIdAndUpdate(
          admin._id,
          { $addToSet: { teams: team._id } }
        );
      }
    }
    
    // Get all users with teams
    const users = await User.find({ teams: { $exists: true, $ne: [] } })
      .populate('teams', 'name');
    
    console.log('\nUser Team Assignments:');
    for (const user of users) {
      console.log(`\nUser: ${user.name} (${user.email})`);
      console.log('Teams:', user.teams.map(t => t.name));
      
      // Verify user is actually in those teams
      for (const team of user.teams) {
        const teamDoc = await Team.findById(team._id);
        if (!teamDoc.members.includes(user._id) && !teamDoc.teamAdmins.includes(user._id)) {
          console.log(`Warning: User is not actually in team ${team.name}`);
          // Remove the team from user's teams array
          await User.findByIdAndUpdate(
            user._id,
            { $pull: { teams: team._id } }
          );
        }
      }
    }
    
    console.log('\nRelationships checked and fixed');
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit();
}

checkTeamRelations(); 