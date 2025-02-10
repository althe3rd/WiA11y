const { getDB } = require('../config/mongodb');

const collection = () => getDB().collection('users');

module.exports = {
  findOne: (query) => collection().findOne(query),
  find: (query) => collection().find(query).toArray(),
  insertOne: (doc) => collection().insertOne(doc),
  updateOne: (query, update) => collection().updateOne(query, update),
  deleteOne: (query) => collection().deleteOne(query)
}; 