import 'dotenv/config';
import { createApp } from './app.js';
import { seedOwner } from './store.js';
import { closeDatabase, connectDatabase } from './database.js';

const port = Number(process.env.PORT ?? 4000);

void connectDatabase().then(async result => {
  if (!result.connected && process.env.NODE_ENV === 'production') throw new Error('MONGODB_URI is required in production');
  if (!result.persistent) console.warn('Running with explicit non-persistent storage; configure MONGODB_URI for production data.');
  await seedOwner();
  const app = createApp();
  app.listen(port, () => console.log(`ERP API listening on http://localhost:${port}`));
  const shutdown = () => void closeDatabase().finally(() => process.exit(0));
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
}).catch(error => { console.error('Database initialization failed', error); process.exit(1); });
