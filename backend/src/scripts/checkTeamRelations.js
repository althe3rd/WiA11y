const { MongoClient, ObjectId } = require('mongodb');

async function checkTeamRelations() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  try {
    await client.connect();
    const db = client.db('accessibility-scanner');
    
    const teams = await db.collection('teams').find({}).toArray();
    const users = await db.collection('users').find({}).toArray();
    
    // Your existing check logic here, but using MongoDB native operations
    // instead of Mongoose methods
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Run the script if called directly
if (require.main === module) {
  checkTeamRelations().catch(console.error);
} 