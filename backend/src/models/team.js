const { getDB } = require('../config/mongodb');
const { ObjectId } = require('mongodb');

const collection = () => getDB().collection('teams');

module.exports = {
  findOne: (query) => collection().findOne(query),
  find: (query) => collection().find(query).toArray(),
  insertOne: (doc) => collection().insertOne(doc),
  updateOne: (query, update) => collection().updateOne(query, update),
  deleteOne: (query) => collection().deleteOne(query),
  
  // Add methods for team-specific operations
  findByMemberId: (userId) => collection().find({ 
    members: new ObjectId(userId) 
  }).toArray(),
  
  addMember: (teamId, userId) => collection().updateOne(
    { _id: new ObjectId(teamId) },
    { $addToSet: { members: new ObjectId(userId) } }
  ),
  
  removeMember: (teamId, userId) => collection().updateOne(
    { _id: new ObjectId(teamId) },
    { $pull: { members: new ObjectId(userId) } }
  )
}; 