import 'dotenv/config';
import { createApp } from './app.js';
import { getJwtSecret } from './auth.js';
import { seedOwner } from './store.js';
import { closeDatabase, connectDatabase } from './database.js';

const port = Number(process.env.PORT ?? 4000);

void connectDatabase().then(async result => {
  getJwtSecret(process.env.NODE_ENV ?? 'development');
  if (!result.connected && process.env.NODE_ENV === 'production') throw new Error('MONGODB_URI is required in production');
  if (!result.persistent && process.env.NODE_ENV === 'production') console.warn('Production storage is not configured; use MongoDB Atlas before public deployment.');
  if (process.env.NODE_ENV !== 'production') await seedOwner();
  const app = createApp();
  app.listen(port, () => console.log(`Fanix API listening on port ${port}`));
  const shutdown = () => void closeDatabase().finally(() => process.exit(0));
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
}).catch(error => { console.error('Database initialization failed'); process.exit(1); });
