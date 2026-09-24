import mongoose from 'mongoose';
import { db } from './store.js';

const stateSchema = new mongoose.Schema({
  key: { type: String, unique: true, index: true },
  version: { type: Number, required: true },
  state: { type: mongoose.Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, required: true }
}, { collection: 'erpApplicationState' });
type StateDocument = { key: string; version: number; state: Partial<typeof db>; updatedAt: Date };
const State = (mongoose.models.ErpApplicationState as mongoose.Model<StateDocument> | undefined)
  ?? mongoose.model<StateDocument>('ErpApplicationState', stateSchema);

let persistenceEnabled = false;
let writeQueue = Promise.resolve();

type StoreState = typeof db;

function snapshot(): StoreState {
  return JSON.parse(JSON.stringify(db)) as StoreState;
}

function restore(state: Partial<StoreState>) {
  for (const key of Object.keys(db) as (keyof StoreState)[]) {
    const value = state[key];
    if (Array.isArray(value)) {
      db[key].splice(0, db[key].length, ...value as never[]);
    }
  }
}

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return { connected: false, persistent: false, reason: 'MONGODB_URI not configured; set STORAGE_MODE=memory only for local development or tests' };
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  persistenceEnabled = true;
  const record = await State.findOne({ key: 'primary' }).lean<StateDocument>();
  if (record?.state) restore(record.state);
  return { connected: true, persistent: true };
}

export function isPersistenceEnabled() {
  return persistenceEnabled;
}

export function persistDatabase() {
  if (!persistenceEnabled) return Promise.resolve();
  writeQueue = writeQueue.then(() => State.updateOne(
    { key: 'primary' },
    { $set: { key: 'primary', version: 1, state: snapshot(), updatedAt: new Date() } },
    { upsert: true }
  ).then(() => undefined));
  return writeQueue;
}

export async function closeDatabase() {
  await writeQueue;
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
