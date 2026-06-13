import 'dotenv/config';

import { defineConfig } from 'drizzle-kit';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://storyverse:storyverse_dev@localhost:55432/storyverse';

export default defineConfig({
  dbCredentials: {
    url: databaseUrl,
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/db/schema.ts',
  strict: true,
  verbose: true,
});
