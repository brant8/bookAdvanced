import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { and, eq, gt } from 'drizzle-orm';

import type { AuthStatus, LoginInput, RegisterInput } from '@storyverse/contracts';

import type { Database } from '../../db/client.js';
import { userSessions, users } from '../../db/schema.js';

const scrypt = promisify(scryptCallback);
const SESSION_DAYS = 30;

export class AuthError extends Error {}

export class AuthService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
    readonly mode: 'local' | 'account',
  ) {}

  async status(token?: string): Promise<AuthStatus> {
    const owner = await this.owner();
    if (this.mode === 'local') {
      return {
        authenticated: true,
        mode: 'local',
        registrationRequired: false,
        user: toUser(owner),
      };
    }
    const sessionUser = token ? await this.sessionUser(token) : null;
    return {
      authenticated: Boolean(sessionUser),
      mode: 'account',
      registrationRequired: !owner.passwordHash,
      user: sessionUser ? toUser(sessionUser) : null,
    };
  }

  async register(input: RegisterInput) {
    const owner = await this.owner();
    if (owner.passwordHash) throw new AuthError('Administrator registration is closed.');
    const passwordHash = await hashPassword(input.password);
    const [updated] = await this.db
      .update(users)
      .set({
        displayName: input.displayName,
        email: input.email.toLowerCase(),
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, this.ownerId))
      .returning();
    if (!updated) throw new AuthError('Local owner was not found.');
    return this.createSession(updated.id);
  }

  async login(input: LoginInput) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, input.email.toLowerCase()))
      .limit(1);
    if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AuthError('Email or password is incorrect.');
    }
    return this.createSession(user.id);
  }

  async logout(token?: string) {
    if (token)
      await this.db.delete(userSessions).where(eq(userSessions.tokenHash, tokenHash(token)));
  }

  async isAuthenticated(token?: string) {
    if (this.mode === 'local') return true;
    return Boolean(token && (await this.sessionUser(token)));
  }

  private async createSession(userId: string) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await this.db.insert(userSessions).values({ expiresAt, tokenHash: tokenHash(token), userId });
    return { expiresAt, token };
  }

  private async sessionUser(token: string) {
    const [row] = await this.db
      .select({ user: users })
      .from(userSessions)
      .innerJoin(users, eq(users.id, userSessions.userId))
      .where(
        and(eq(userSessions.tokenHash, tokenHash(token)), gt(userSessions.expiresAt, new Date())),
      )
      .limit(1);
    return row?.user ?? null;
  }

  private async owner() {
    const [owner] = await this.db.select().from(users).where(eq(users.id, this.ownerId)).limit(1);
    if (!owner) throw new AuthError('Local owner was not found.');
    return owner;
  }
}

function toUser(user: typeof users.$inferSelect) {
  return {
    displayName: user.displayName,
    email: user.email,
    id: user.id,
    role: 'owner' as const,
  };
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString('base64')}:${derived.toString('base64')}`;
}

async function verifyPassword(password: string, encoded: string) {
  const [, saltValue, hashValue] = encoded.split(':');
  if (!saltValue || !hashValue) return false;
  const expected = Buffer.from(hashValue, 'base64');
  const actual = (await scrypt(
    password,
    Buffer.from(saltValue, 'base64'),
    expected.length,
  )) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
