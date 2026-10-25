'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  TRADES_COOKIE, SESSION_DAYS, parseOwnerKeys, checkCode, makeSession,
  recordFailure, lockedFor, type AttemptStore,
} from '@/lib/owner-auth';

export interface UnlockState {
  error: string | null;
}

// Per server instance — see recordFailure().
const attempts: AttemptStore = new Map();

export async function unlockTrades(_prev: UnlockState, form: FormData): Promise<UnlockState> {
  const slug = String(form.get('slug') ?? '');
  const typed = String(form.get('code') ?? '');
  const rawKeys = process.env.OWNER_KEYS;
  if (!rawKeys) return { error: 'Passcodes are not set up yet.' };

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const key = `${ip}|${slug}`;
  const now = Date.now();
  const wait = lockedFor(attempts, key, now);
  if (wait > 0) return { error: `Too many tries. Wait ${Math.ceil(wait / 60_000)} min.` };

  const who = checkCode(slug, typed, parseOwnerKeys(rawKeys), process.env.ADMIN_KEY);
  if (!who) {
    const locked = recordFailure(attempts, key, now);
    return { error: locked > 0 ? `Too many tries. Wait ${Math.ceil(locked / 60_000)} min.` : 'Wrong code.' };
  }

  attempts.delete(key);
  (await cookies()).set(TRADES_COOKIE, makeSession(who, rawKeys, now), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/trades',
    maxAge: SESSION_DAYS * 86_400,
  });
  revalidatePath(`/trades/${slug}`);
  return { error: null };
}

export async function lockTrades(form: FormData): Promise<void> {
  (await cookies()).delete({ name: TRADES_COOKIE, path: '/trades' });
  revalidatePath(`/trades/${String(form.get('slug') ?? '')}`);
}
