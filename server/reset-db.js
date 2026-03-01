// Drop all collections and re-seed (run before test.js)
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function reset() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    await mongoose.connection.db.dropCollection(col.name);
    console.log(`  Dropped: ${col.name}`);
  }

  console.log('✅ All collections dropped. Run seed + test now.');
  process.exit(0);
}

reset().catch(console.error);
