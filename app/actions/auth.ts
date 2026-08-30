'use server';

import {
  validateAdminCredentials,
  signSessionToken,
  setSessionCookie,
  removeSessionCookie,
  getCurrentSession,
} from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { redirect } from 'next/navigation';

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

export async function loginAction(formData: FormData | { email: string; pass: string }): Promise<AuthActionResult> {
  let email = '';
  let password = '';

  if (formData instanceof FormData) {
    email = (formData.get('email') as string) || '';
    password = (formData.get('password') as string) || '';
  } else {
    email = formData.email || '';
    password = formData.pass || '';
  }

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid input',
    };
  }

  const isValid = validateAdminCredentials(parsed.data.email, parsed.data.password);
  if (!isValid) {
    return {
      success: false,
      error: 'Invalid credentials. Please verify your email and password.',
    };
  }

  const token = await signSessionToken(parsed.data.email);
  await setSessionCookie(token);

  return { success: true };
}

export async function logoutAction() {
  await removeSessionCookie();
  redirect('/login');
}

export async function getAuthSessionAction() {
  const session = await getCurrentSession();
  return session ? { authenticated: true, email: session.email } : { authenticated: false };
}
