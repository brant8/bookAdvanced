import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase } from '../../db/client.js';
import { getDatabaseUrl } from '../../db/config.js';
import { userSessions, users } from '../../db/schema.js';
import { AuthService } from './auth.service.js';

const { db, pool } = createDatabase(getDatabaseUrl());
const migrationsFolder = fileURLToPath(new URL('../../../drizzle', import.meta.url));

beforeAll(async () => migrate(db, { migrationsFolder }));
afterAll(async () => pool.end());

describe('AuthService integration', () => {
  it('registers the self-hosted owner and validates its session', async () => {
    const [owner] = await db
      .insert(users)
      .values({ displayName: 'Auth test owner', isLocal: false })
      .returning();
    expect(owner).toBeDefined();
    const service = new AuthService(db, owner!.id, 'account');
    const session = await service.register({
      displayName: 'NAS Owner',
      email: `auth-${owner!.id}@example.test`,
      password: 'a-secure-test-password',
    });
    const status = await service.status(session.token);
    expect(status.authenticated).toBe(true);
    expect(status.user?.displayName).toBe('NAS Owner');
    await service.logout(session.token);
    expect((await service.status(session.token)).authenticated).toBe(false);
    await db.delete(userSessions).where(eq(userSessions.userId, owner!.id));
    await db.delete(users).where(eq(users.id, owner!.id));
  });
});
