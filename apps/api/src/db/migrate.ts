import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { createDatabase } from './client.js';
import { getDatabaseUrl } from './config.js';

const { db, pool } = createDatabase(getDatabaseUrl());

try {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Database migrations applied.');
} finally {
  await pool.end();
}
