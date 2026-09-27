import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface DbUser {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  district?: string;
  phone?: string;
  traineeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  timestamp: string;
}

export interface ReminderLog {
  id: string;
  traineeId: string;
  traineeName: string;
  phone?: string;
  channel: 'WhatsApp' | 'SMS' | 'Email' | 'IVR';
  status: 'sent_simulated' | 'delivered_simulated' | 'failed';
  milestone?: string;
  sentAt: string;
  initiatedBy: string;
  notes?: string;
}

const DATA_TABLES = new Set([
  'trainees', 'employees', 'trainingPrograms', 'providers', 'employers', 'skills', 'followups',
]);

const inMemoryStore = new Map<string, any[]>();

export function getFallbackCollection(name: string): any {
  if (!inMemoryStore.has(name)) {
    inMemoryStore.set(name, []);
  }
  const records = inMemoryStore.get(name)!;

  return {
    async findOne(query: Record<string, any>, options: { projection?: Record<string, number> } = {}) {
      const found = records.find((item) => {
        return Object.entries(query).every(([k, v]) => item[k] === v);
      });
      if (!found) return null;
      const copy = { ...found };
      if (options.projection?.passwordHash === 0) delete copy.passwordHash;
      if (options.projection?._id === 0) delete copy._id;
      return copy;
    },
    find(query: Record<string, any> = {}, options: { projection?: Record<string, number> } = {}) {
      let filtered = records.filter((item) => {
        return Object.entries(query).every(([k, v]) => item[k] === v);
      });
      return {
        sort(sortObj: Record<string, number>) {
          const [key, dir] = Object.entries(sortObj)[0] || [];
          if (key) {
            filtered = [...filtered].sort((a, b) => {
              if (a[key] < b[key]) return dir === 1 ? -1 : 1;
              if (a[key] > b[key]) return dir === 1 ? 1 : -1;
              return 0;
            });
          }
          return this;
        },
        limit(n: number) {
          filtered = filtered.slice(0, n);
          return this;
        },
        async toArray() {
          return filtered.map((r) => {
            const copy = { ...r };
            if (options.projection?.passwordHash === 0) delete copy.passwordHash;
            if (options.projection?._id === 0) delete copy._id;
            return copy;
          });
        },
      };
    },
    async insertOne(doc: any) {
      records.push({ ...doc });
      return { acknowledged: true, insertedId: doc.id || doc._id };
    },
    async insertMany(docs: any[]) {
      for (const d of docs) records.push({ ...d });
      return { acknowledged: true, insertedCount: docs.length };
    },
    async replaceOne(filter: Record<string, any>, doc: any, options: { upsert?: boolean } = {}) {
      const idx = records.findIndex((item) => Object.entries(filter).every(([k, v]) => item[k] === v));
      if (idx >= 0) {
        records[idx] = { ...doc };
      } else if (options.upsert) {
        records.push({ ...doc });
      }
      return { acknowledged: true };
    },
    async findOneAndUpdate(filter: Record<string, any>, update: { $set?: Record<string, any> }) {
      const item = records.find((it) => Object.entries(filter).every(([k, v]) => it[k] === v));
      if (item && update.$set) {
        Object.assign(item, update.$set);
        return { ...item };
      }
      return null;
    },
    async updateOne(filter: Record<string, any>, update: { $set?: Record<string, any> }) {
      const item = records.find((it) => Object.entries(filter).every(([k, v]) => it[k] === v));
      if (item && update.$set) {
        Object.assign(item, update.$set);
        return { matchedCount: 1, modifiedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    },
    async deleteOne(filter: Record<string, any>) {
      const idx = records.findIndex((item) => Object.entries(filter).every(([k, v]) => item[k] === v));
      if (idx >= 0) {
        records.splice(idx, 1);
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    },
    async deleteMany(_filter: Record<string, any> = {}) {
      const count = records.length;
      records.length = 0;
      return { deletedCount: count };
    },
    async countDocuments() {
      return records.length;
    },
    async createIndex() {
      return 'index_created';
    },
  };
}

export function collection(name: string) {
  const db = mongoose.connection.db;
  if (db && mongoose.connection.readyState === 1) return db.collection(name);
  return getFallbackCollection(name);
}
function assertDataTable(name: string) {
  if (!DATA_TABLES.has(name)) throw new Error(`Unknown data table: ${name}`);
}
function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Audit logging must never cause the main request to fail.
export function logActivity(
  action: string, entityType: string, entityId: string, details: string,
  userId = 'system', userName = 'System'
): void {
  const row: ActivityLog = {
    id: newId('LOG'), userId, userName, action, entityType, entityId, details,
    timestamp: new Date().toISOString(),
  };
  void collection('activity_logs').insertOne(row).catch((error) => {
    console.error('Failed to log activity in MongoDB:', error);
  });
}

export async function getLogs(limit = 50): Promise<ActivityLog[]> {
  return collection('activity_logs').find({}, { projection: { _id: 0 } })
    .sort({ timestamp: -1 }).limit(Math.max(1, limit)).toArray() as unknown as ActivityLog[];
}

export async function insertReminderLog(log: Omit<ReminderLog, 'id' | 'sentAt'>): Promise<ReminderLog> {
  const fullLog: ReminderLog = { id: newId('REM'), sentAt: new Date().toISOString(), ...log };
  await collection('reminder_logs').insertOne(fullLog);
  return fullLog;
}

export async function getReminderLogs(limit = 100): Promise<ReminderLog[]> {
  return collection('reminder_logs').find({}, { projection: { _id: 0 } })
    .sort({ sentAt: -1 }).limit(Math.max(1, limit)).toArray() as unknown as ReminderLog[];
}

export async function getReminderLogsByTrainee(traineeId: string): Promise<ReminderLog[]> {
  return collection('reminder_logs').find({ traineeId }, { projection: { _id: 0 } })
    .sort({ sentAt: -1 }).toArray() as unknown as ReminderLog[];
}

export async function getTableRecords<T = unknown>(tableName: string): Promise<T[]> {
  assertDataTable(tableName);
  return collection(tableName).find({}, { projection: { _id: 0, __v: 0 } }).toArray() as unknown as T[];
}

export async function insertTableRecord<T extends { id: string }>(tableName: string, record: T): Promise<void> {
  assertDataTable(tableName);
  await collection(tableName).replaceOne({ id: record.id }, record, { upsert: true });
}

export async function updateTableRecord<T = Record<string, unknown>>(
  tableName: string, id: string, patch: Record<string, unknown>
): Promise<T | null> {
  assertDataTable(tableName);
  const safePatch = { ...patch };
  delete safePatch._id;
  const updated = await collection(tableName).findOneAndUpdate(
    { id }, { $set: safePatch }, { returnDocument: 'after', projection: { _id: 0, __v: 0 } }
  );
  return (updated ?? null) as T | null;
}

export async function deleteTableRecord(tableName: string, id: string): Promise<boolean> {
  assertDataTable(tableName);
  const result = await collection(tableName).deleteOne({ id });
  return result.deletedCount > 0;
}

// Admin reset restores only public seed data. It deliberately keeps accounts and audit history.
export async function seedDatabase(force = false): Promise<void> {
  if (!force) {
    const count = await collection('trainees').countDocuments();
    if (count > 0) return;
  }
  const publicDataDir = path.resolve(process.cwd(), 'public', 'data');
  for (const table of DATA_TABLES) {
    let raw: string;
    try { raw = await fs.readFile(path.join(publicDataDir, `${table}.json`), 'utf8'); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    const records = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(records)) throw new Error(`Seed file ${table}.json must contain an array`);
    const target = collection(table);
    await target.deleteMany({});
    if (records.length) await target.insertMany(records, { ordered: false });
    console.log(`Seeded ${records.length} records into MongoDB collection ${table}`);
  }
}
