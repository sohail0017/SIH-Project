import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import mongoose from 'mongoose';
import path from 'node:path';

const sqlite = new DatabaseSync(path.resolve('data/skilltrack.db'));

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing from .env');

  await mongoose.connect(uri);

  const mongoDb = mongoose.connection.db;
  if (!mongoDb) throw new Error('MongoDB connection did not provide a database');

  const users = sqlite.prepare('SELECT * FROM users').all();
  const collection = mongoDb.collection('users');

  await collection.createIndex({ id: 1 }, { unique: true });

  for (const user of users) {
    await collection.replaceOne({ id: user.id }, user, { upsert: true });
  }

  console.log(`${users.length} user accounts synchronized to ${mongoDb.databaseName}.`);
}

main()
  .catch((error) => {
    console.error('User sync failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    sqlite.close();
    await mongoose.disconnect();
  });