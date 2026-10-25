'use client';

import { useActionState } from 'react';
import { unlockTrades, type UnlockState } from '@/app/trades/actions';

/** Passcode box for one owner's trade page. Success re-renders the page unlocked. */
export default function TradeUnlockForm({ slug, owner }: { slug: string; owner: string }) {
  const [state, action, pending] = useActionState<UnlockState, FormData>(unlockTrades, { error: null });

  return (
    <form action={action} className="bg-surface border border-border rounded-2xl p-5 max-w-sm flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      <div>
        <p className="text-[17px] font-black text-foreground">🔒 {owner}&apos;s trade advice</p>
        <p className="text-[13px] text-muted mt-1">Only {owner} can open this page. Enter your code.</p>
      </div>
      <input
        name="code"
        type="password"
        autoComplete="current-password"
        autoCapitalize="characters"
        autoFocus
        required
        maxLength={64}
        placeholder="Code"
        aria-label="Code"
        className="h-11 rounded-xl border border-border bg-background px-3 text-[16px] font-mono tracking-[0.3em] text-foreground"
      />
      {state.error && <p role="alert" className="text-[13px] font-semibold text-negative-text">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-xl bg-accent text-white text-[15px] font-bold disabled:opacity-60"
      >
        {pending ? 'Checking…' : 'Open'}
      </button>
    </form>
  );
}
