import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const AUTH_SECRET_STR = process.env.AUTH_SECRET || 'default_secure_secret_fallback_key_32_chars';
const SECRET_KEY = new TextEncoder().encode(AUTH_SECRET_STR);
const COOKIE_NAME = 'taskflow_session';

export interface ISessionPayload {
  userId: string;
  email: string;
  name?: string;
}

/**
 * Constant-time comparison of two strings using crypto.timingSafeEqual.
 * Prevents timing attacks on credentials and tokens.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');

  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Secure password hashing using native Node.js crypto.scrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verifies a plaintext password against a stored salt:hash string in constant time.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve) => {
    const parts = stored.split(':');
    if (parts.length !== 2) return resolve(false);
    const [salt, key] = parts;
    const keyBuffer = Buffer.from(key, 'hex');

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      if (derivedKey.length !== keyBuffer.length) {
        crypto.timingSafeEqual(derivedKey, derivedKey);
        return resolve(false);
      }
      resolve(crypto.timingSafeEqual(derivedKey, keyBuffer));
    });
  });
}

/**
 * Generates a unique, high-entropy MCP API Key (e.g. "tf_live_a1b2c3...").
 * Returns raw key for user display (once) and SHA-256 hash for fast indexed DB lookups.
 */
export function generateApiKey(): { rawKey: string; keyHash: string; keyPreview: string } {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const rawKey = `tf_live_${randomBytes}`;
  const keyHash = hashApiKey(rawKey);
  const keyPreview = `tf_live_...${rawKey.slice(-4)}`;

  return { rawKey, keyHash, keyPreview };
}

/**
 * Computes SHA-256 hash of an API key for constant-time indexed lookup.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key.trim()).digest('hex');
}

/**
 * Issues signed JWT session token with user ID and email.
 */
export async function signSessionToken(payload: ISessionPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

/**
 * Verifies JWT session token.
 */
export async function verifySessionToken(token: string): Promise<ISessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ['HS256'],
    });
    if (!payload.userId || typeof payload.userId !== 'string') return null;
    return {
      userId: payload.userId as string,
      email: (payload.email as string) || '',
      name: (payload.name as string) || '',
    };
  } catch {
    return null;
  }
}

/**
 * Sets session cookie in response headers.
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Removes session cookie on logout.
 */
export async function removeSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Retrieves and verifies current active session from cookies.
 */
export async function getCurrentSession(): Promise<ISessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
