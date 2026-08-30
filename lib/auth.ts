import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const AUTH_SECRET_STR = process.env.AUTH_SECRET || 'default_secure_secret_fallback_key_32_chars';
const SECRET_KEY = new TextEncoder().encode(AUTH_SECRET_STR);
const COOKIE_NAME = 'taskflow_session';

/**
 * Constant-time comparison of two strings using crypto.timingSafeEqual
 * Prevents timing attacks on admin credentials.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');

  if (bufA.length !== bufB.length) {
    // Return false without fast-path timing leakage
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validates provided credentials against environment variables in constant time
 */
export function validateAdminCredentials(email: string, pass: string): boolean {
  const envEmail = process.env.AUTH_EMAIL || '';
  const envPassword = process.env.AUTH_PASSWORD || '';

  if (!envEmail || !envPassword) {
    return false;
  }

  const emailMatch = timingSafeCompare(email.trim().toLowerCase(), envEmail.trim().toLowerCase());
  const passMatch = timingSafeCompare(pass, envPassword);

  return emailMatch && passMatch;
}

/**
 * Issues signed JWT session token
 */
export async function signSessionToken(email: string): Promise<string> {
  return new SignJWT({ email, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

/**
 * Verifies JWT session token
 */
export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ['HS256'],
    });
    return payload as { email: string; role: string; exp: number };
  } catch {
    return null;
  }
}

/**
 * Sets session cookie in response
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
 * Removes session cookie
 */
export async function removeSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Retrieves current active session from cookies
 */
export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
