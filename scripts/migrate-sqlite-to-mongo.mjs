import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import mongoose from 'mongoose';
import path from 'node:path';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is missing from .env');

const sqlitePath = path.resolve('data/skilltrack.db');
const sqlite = new DatabaseSync(sqlitePath);

const sourceTables = [
  'trainees',
  'employees',
  'trainingPrograms',
  'providers',
  'employers',
  'skills',
  'followups',
];

const columnTables = ['users', 'activity_logs', 'reminder_logs'];

function readJsonTable(table) {
  return sqlite
    .prepare(`SELECT data FROM "${table}"`)
    .all()
    .map((row) => JSON.parse(row.data));
}

async function main() {
  await mongoose.connect(uri);

  const mongoDb = mongoose.connection.db;
  if (!mongoDb) throw new Error('MongoDB connection did not provide a database');

  console.log(`Connected to MongoDB database: ${mongoDb.databaseName}`);

  const collections = [
    ...sourceTables,
    'users',
    'activity_logs',
    'reminder_logs',
  ];

  // Refuse to import into a database that already has records in these collections.
  for (const name of collections) {
    const count = await mongoDb.collection(name).countDocuments();
    if (count > 0) {
      throw new Error(
        `Collection "${name}" already has ${count} records. Use a fresh database or stop and review before importing.`
      );
    }
  }

  const records = new Map();

  for (const table of sourceTables) {
    records.set(table, readJsonTable(table));
  }

  for (const table of columnTables) {
    records.set(table, sqlite.prepare(`SELECT * FROM "${table}"`).all());
  }

  for (const [name, rows] of records) {
    if (rows.length === 0) {
      console.log(`${name}: 0 records`);
      continue;
    }

    await mongoDb.collection(name).insertMany(rows);
    console.log(`${name}: imported ${rows.length} records`);
  }

  console.log('Import finished. Verify the counts in Atlas before changing the app.');
}

main()
  .catch((error) => {
    console.error('Import stopped:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    sqlite.close();
    await mongoose.disconnect();
  });