import { eq } from 'drizzle-orm';

import type { Database } from '../../db/client.js';
import { users } from '../../db/schema.js';

const LOCAL_USER_DISPLAY_NAME = '本地创作者';

export async function ensureLocalUser(db: Database) {
  const [existingUser] = await db.select().from(users).where(eq(users.isLocal, true)).limit(1);

  if (existingUser) {
    return existingUser;
  }

  await db
    .insert(users)
    .values({
      displayName: LOCAL_USER_DISPLAY_NAME,
      isLocal: true,
    })
    .onConflictDoNothing();

  const [localUser] = await db.select().from(users).where(eq(users.isLocal, true)).limit(1);

  if (!localUser) {
    throw new Error('Failed to initialize the local user.');
  }

  return localUser;
}
