import { Hono, type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

import { apiErrorSchema, loginSchema, registerSchema } from '@storyverse/contracts';

import { AuthError, type AuthService } from './auth.service.js';

const COOKIE = 'storyverse_session';

export function createAuthRoutes(service: AuthService) {
  const routes = new Hono();

  routes.get('/status', async (context) =>
    context.json(await service.status(getCookie(context, COOKIE))),
  );
  routes.post('/register', async (context) => {
    const parsed = registerSchema.safeParse(await body(context));
    if (!parsed.success) return error(context, 400, 'Invalid registration details.');
    try {
      const session = await service.register(parsed.data);
      sessionCookie(context, session.token, session.expiresAt);
      return context.json(await service.status(session.token), 201);
    } catch (cause) {
      if (cause instanceof AuthError) return error(context, 409, cause.message);
      throw cause;
    }
  });
  routes.post('/login', async (context) => {
    const parsed = loginSchema.safeParse(await body(context));
    if (!parsed.success) return error(context, 400, 'Invalid login details.');
    try {
      const session = await service.login(parsed.data);
      sessionCookie(context, session.token, session.expiresAt);
      return context.json(await service.status(session.token));
    } catch (cause) {
      if (cause instanceof AuthError) return error(context, 401, cause.message);
      throw cause;
    }
  });
  routes.post('/logout', async (context) => {
    await service.logout(getCookie(context, COOKIE));
    deleteCookie(context, COOKIE, { path: '/' });
    return context.body(null, 204);
  });

  return routes;
}

export function sessionToken(context: Parameters<typeof getCookie>[0]) {
  return getCookie(context, COOKIE);
}

function sessionCookie(context: Parameters<typeof setCookie>[0], token: string, expires: Date) {
  setCookie(context, COOKIE, token, {
    expires,
    httpOnly: true,
    path: '/',
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

async function body(context: { req: { json(): Promise<unknown> } }) {
  try {
    return await context.req.json();
  } catch {
    return null;
  }
}

function error(context: Context, status: 400 | 401 | 409, message: string) {
  return context.json(apiErrorSchema.parse({ error: { code: 'AUTH_ERROR', message } }), status);
}
