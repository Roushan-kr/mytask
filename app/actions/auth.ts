'use server';

import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import {
  hashPassword,
  verifyPassword,
  generateApiKey,
  signSessionToken,
  setSessionCookie,
  removeSessionCookie,
  getCurrentSession,
} from '@/lib/auth';
import { authSchema } from '@/lib/validations';
import { threadService } from '@/lib/services/thread.service';
import { redirect } from 'next/navigation';

export interface AuthActionResult {
  success: boolean;
  error?: string;
  isNewUser?: boolean;
}

/**
 * Unified Auth Action: Authenticates existing users or automatically registers new users.
 */
export async function loginAction(formData: FormData | { email: string; pass?: string; password?: string }): Promise<AuthActionResult> {
  let email = '';
  let password = '';

  if (formData instanceof FormData) {
    email = (formData.get('email') as string) || '';
    password = (formData.get('password') as string) || '';
  } else {
    email = formData.email || '';
    password = formData.password || formData.pass || '';
  }

  const parsed = authSchema.safeParse({ email, password });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid email or password format (min 6 characters required).',
    };
  }

  await connectDB();
  const cleanEmail = parsed.data.email.toLowerCase().trim();
  let user = await User.findOne({ email: cleanEmail });

  if (!user) {
    // 1. Auto-Registration for new user
    const passwordHash = await hashPassword(parsed.data.password);
    user = await User.create({
      email: cleanEmail,
      passwordHash,
      name: parsed.data.name || cleanEmail.split('@')[0],
    });

    // Auto-provision initial workspace thread
    await threadService.listThreads(user._id.toString());

    const token = await signSessionToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });
    await setSessionCookie(token);

    return { success: true, isNewUser: true };
  }

  // 2. Existing user password verification
  const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!isValid) {
    return {
      success: false,
      error: 'Invalid password. Please check your password or try a different email.',
    };
  }

  const token = await signSessionToken({
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
  });
  await setSessionCookie(token);

  return { success: true, isNewUser: false };
}

export async function logoutAction() {
  await removeSessionCookie();
  redirect('/login');
}

export async function getAuthSessionAction() {
  const session = await getCurrentSession();
  if (!session) return { authenticated: false };

  await connectDB();
  const user = await User.findById(session.userId).select('email name mcpApiKeyPreview').lean();
  return {
    authenticated: true,
    userId: session.userId,
    email: session.email,
    name: user?.name || session.name || '',
    mcpApiKeyPreview: user?.mcpApiKeyPreview || null,
  };
}

/**
 * Generates or regenerates personal MCP API Key for AI Agent integration.
 */
export async function generateMcpApiKeyAction(): Promise<{ success: boolean; rawKey?: string; keyPreview?: string; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) return { success: false, error: 'Unauthorized' };

    await connectDB();
    const { rawKey, keyHash, keyPreview } = generateApiKey();

    await User.findByIdAndUpdate(session.userId, {
      $set: {
        mcpApiKeyHash: keyHash,
        mcpApiKeyPreview: keyPreview,
      },
    });

    return { success: true, rawKey, keyPreview };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to generate API Key' };
  }
}

/**
 * Revokes active MCP API Key.
 */
export async function revokeMcpApiKeyAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) return { success: false, error: 'Unauthorized' };

    await connectDB();
    await User.findByIdAndUpdate(session.userId, {
      $unset: {
        mcpApiKeyHash: 1,
        mcpApiKeyPreview: 1,
      },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to revoke API Key' };
  }
}
