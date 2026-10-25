import OwnerAvatar from './OwnerAvatar';
import type { TradeIdea, TradePlayerCard, TradeAngle, DiagnosisFlag } from '@/lib/trade-output';

export const ANGLE_LABELS: Record<TradeAngle, string> = {
  'sell-high': 'Sell high',
  'buy-low': 'Buy low',
  consolidation: 'Consolidation',
  depth: 'Depth',
  'positional-need': 'Fills a position',
  'playoff-schedule': 'Playoff schedule',
  'injury-cover': 'Injury cover',
};

export const FLAG_LABELS: Record<DiagnosisFlag, string> = {
  'no-star': 'No star',
  'thin-middle': 'Thin middle',
  'too-much-depth': 'Too much depth',
  inactive: 'Inactive',
  'tough-schedule': 'Tough schedule',
  injuries: 'Injuries',
  'playoff-push': 'Playoff push',
  contender: 'Contender',
};

/** Sell high / buy low get the state colours; the rest stay neutral. */
function angleClass(a: TradeAngle): string {
  if (a === 'sell-high') return 'bg-warning-surface text-warning-text';
  if (a === 'buy-low') return 'bg-positive-surface text-positive-text';
  return 'bg-background text-muted border border-border';
}

const fmt = (n: number | null) => (n === null ? '–' : n.toFixed(1));

function PlayerRow({ p }: { p: TradePlayerCard }) {
  const hurt = p.injuryStatus !== 'ACTIVE';
  return (
    <li className="py-2 border-b border-border last:border-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[14px] font-bold text-foreground truncate">{p.name}</p>
        {hurt && (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-negative-text">
            {p.injuryStatus.replace(/_/g, '-')}
          </span>
        )}
      </div>
      <p className="text-[12px] text-muted">
        {p.proTeam} · {p.positions.join('/')}
      </p>
      <p className="type-stat text-[12px] text-foreground mt-0.5">
        {fmt(p.avgSeason)} avg · {fmt(p.avgProjected)} proj · {p.gamesPlayoffs} playoff games
      </p>
    </li>
  );
}

function Side({ label, players }: { label: string; players: TradePlayerCard[] }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="type-section-label mb-1">{label}</p>
      <ul>{players.map(p => <PlayerRow key={p.playerId} p={p} />)}</ul>
    </div>
  );
}

export default function TradeIdeaCard({ idea, rank }: { idea: TradeIdea; rank: number }) {
  return (
    <article className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-3">
      <header className="flex items-center gap-2.5">
        <span className="type-stat text-[13px] text-muted w-5">#{rank}</span>
        <OwnerAvatar ownerName={idea.partnerOwner} teamName={idea.partnerTeamName} size={32} />
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-foreground truncate">with {idea.partnerOwner}</p>
          <p className="text-[12px] text-muted truncate">{idea.partnerTeamName}</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {idea.angles.map(a => (
          <span key={a} className={`text-[11px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 ${angleClass(a)}`}>
            {ANGLE_LABELS[a] ?? a}
          </span>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-5">
        <Side label="You give" players={idea.give} />
        <div aria-hidden className="hidden sm:flex items-center text-muted text-[18px]">⇄</div>
        <Side label="You get" players={idea.get} />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[14px] leading-relaxed text-foreground">
          <span className="font-bold">Why it helps you: </span>{idea.whyForYou}
        </p>
        <p className="text-[14px] leading-relaxed text-secondary">
          <span className="font-bold">Why they&apos;d say yes: </span>{idea.whyTheyAccept}
        </p>
      </div>

      {(idea.dropsNeeded.you > 0 || idea.dropsNeeded.partner > 0) && (
        <p className="text-[12px] text-muted">
          {idea.dropsNeeded.you > 0 && `You'd need to drop ${idea.dropsNeeded.you} player${idea.dropsNeeded.you > 1 ? 's' : ''}. `}
          {idea.dropsNeeded.partner > 0 && `${idea.partnerOwner} would need to drop ${idea.dropsNeeded.partner}.`}
        </p>
      )}
    </article>
  );
}
