'use client';

import { useActionState, useState } from 'react';
import { submitTradeRequest, type RequestFormState } from '@/app/trades/request-actions';
import type { PickerTeam } from '@/lib/trade-requests';

const MAX_NOTE = 200;

/** "Ask Claude" box: pick sell/buy and one player. Claude answers at the next scheduled run. */
export default function TradeRequestForm({
  slug, owner, rosters, left, nextRun, commissioner,
}: {
  slug: string;
  owner: string;
  rosters: PickerTeam[];
  left: number;
  nextRun: string;
  commissioner: boolean;
}) {
  const [state, action, pending] = useActionState<RequestFormState, FormData>(submitTradeRequest, { error: null, sent: false });
  const [kind, setKind] = useState<'sell' | 'buy'>('sell');
  const mine = rosters.find(t => t.owner === owner);
  const others = rosters.filter(t => t.owner !== owner);
  const blocked = left === 0 && !commissioner;

  const option = (p: PickerTeam['players'][number]) => (
    <option key={p.playerId} value={p.playerId}>{p.name} · {p.proTeam} · {p.positions.join('/')}</option>
  );

  return (
    <section className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-3">
      <div>
        <p className="type-section-label">Ask Claude</p>
        <p className="text-[13px] text-muted mt-1">
          Pick one player. Claude answers with up to 3 trade ideas at the next run, about {nextRun} (Israel time).
        </p>
      </div>

      {blocked ? (
        <p className="text-[14px] text-muted">You&apos;ve used your requests for today. Come back tomorrow.</p>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="kind" value={kind} />

          <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="What do you want?">
            {([['sell', 'Trade my player'], ['buy', 'I want a player']] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={`h-10 rounded-xl text-[14px] font-bold border ${
                  kind === k ? 'bg-accent text-white border-accent' : 'bg-background text-foreground border-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-foreground">
              {kind === 'sell' ? 'Which of your players?' : 'Which player do you want?'}
            </span>
            <select
              key={kind}
              name="playerId"
              required
              defaultValue=""
              className="h-11 rounded-xl border border-border bg-background px-3 text-[15px] text-foreground"
            >
              <option value="" disabled>Choose a player</option>
              {kind === 'sell'
                ? mine?.players.map(option)
                : others.map(t => (
                  <optgroup key={t.owner} label={`${t.owner} · ${t.teamName}`}>{t.players.map(option)}</optgroup>
                ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-foreground">Note for Claude (optional)</span>
            <textarea
              name="note"
              maxLength={MAX_NOTE}
              rows={2}
              placeholder={kind === 'sell' ? 'e.g. I need a center back' : 'e.g. I don’t want to give up my stars'}
              className="rounded-xl border border-border bg-background px-3 py-2 text-[15px] text-foreground"
            />
          </label>

          {state.error && <p role="alert" className="text-[13px] font-semibold text-negative-text">{state.error}</p>}
          {state.sent && !pending && (
            <p role="status" className="text-[13px] font-semibold text-positive-text">
              Sent! Claude answers about {nextRun}. It shows up below.
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-muted">
              {commissioner ? 'Commissioner — no daily limit' : `${left} request${left === 1 ? '' : 's'} left today`}
            </span>
            <button
              type="submit"
              disabled={pending}
              className="h-11 px-5 rounded-xl bg-accent text-white text-[15px] font-bold disabled:opacity-60"
            >
              {pending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
