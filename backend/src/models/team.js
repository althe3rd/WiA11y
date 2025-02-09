const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teamAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  domains: [{
    domain: String,
    notes: String
  }],
  createdAt: { type: Date, default: Date.now }
});

// Middleware to update user references
teamSchema.pre('save', async function(next) {
  try {
    // Get the modified paths
    const modifiedPaths = this.modifiedPaths();
    
    // If members or admins were modified
    if (modifiedPaths.includes('members') || modifiedPaths.includes('teamAdmins')) {
      const User = mongoose.model('User');
      
      // Get previous version of the team if it exists
      const oldTeam = await this.constructor.findById(this._id);
      
      if (oldTeam) {
        // Remove team reference from users no longer in the team
        const oldMembers = [...oldTeam.members, ...oldTeam.teamAdmins];
        const newMembers = [...this.members, ...this.teamAdmins];
        const removedMembers = oldMembers.filter(m => !newMembers.includes(m.toString()));
        
        if (removedMembers.length) {
          await User.updateMany(
            { _id: { $in: removedMembers } },
            { $pull: { teams: this._id } }
          );
        }
      }
      
      // Add team reference to all current members and admins
      const allMembers = [...this.members, ...this.teamAdmins];
      if (allMembers.length) {
        await User.updateMany(
          { _id: { $in: allMembers } },
          { $addToSet: { teams: this._id } }
        );
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware to clean up user references when team is deleted
teamSchema.pre('remove', async function(next) {
  try {
    const User = mongoose.model('User');
    const allMembers = [...this.members, ...this.teamAdmins];
    
    if (allMembers.length) {
      await User.updateMany(
        { _id: { $in: allMembers } },
        { $pull: { teams: this._id } }
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Team', teamSchema); 