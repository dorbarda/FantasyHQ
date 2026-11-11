import TradeIdeaCard from './TradeIdeaCard';
import type { TradeRequest } from '@/lib/trade-requests';

function when(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem',
  });
}

const question = (r: TradeRequest) =>
  r.kind === 'sell' ? `Trade my ${r.playerName}` : `I want ${r.playerName} (${r.playerOwner})`;

/** The owner's requests, newest first: waiting ones, then Claude's answers as trade cards. */
export default function TradeRequestList({ requests, nextRun }: { requests: TradeRequest[]; nextRun: string }) {
  if (requests.length === 0) return null;
  const sorted = [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <section className="flex flex-col gap-3">
      <p className="type-section-label">Your requests</p>
      {sorted.map(r => (
        <details
          key={r.id}
          open={r === sorted[0]}
          className="bg-surface border border-border rounded-2xl p-4 group"
        >
          <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-foreground truncate">{question(r)}</p>
              <p className="text-[12px] text-muted">{when(r.createdAt)}</p>
            </div>
            <span className={`shrink-0 text-[11px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 ${
              r.status === 'answered' ? 'bg-positive-surface text-positive-text' : 'bg-warning-surface text-warning-text'
            }`}>
              {r.status === 'answered' ? 'Answered' : 'Waiting'}
            </span>
          </summary>

          <div className="flex flex-col gap-3 mt-3">
            {r.note && <p className="text-[13px] text-muted">Your note: “{r.note}”</p>}
            {r.status === 'pending' || !r.answer ? (
              <p className="text-[14px] text-muted">Claude answers at the next run, about {nextRun} (Israel time).</p>
            ) : (
              <>
                <p className="text-[15px] leading-relaxed text-foreground">{r.answer.summary}</p>
                {r.answer.trades.map((idea, i) => <TradeIdeaCard key={i} idea={idea} rank={i + 1} />)}
                <p className="text-[12px] text-muted">Based on ESPN data from {when(r.answer.inputGeneratedAt)}.</p>
              </>
            )}
          </div>
        </details>
      ))}
    </section>
  );
}
