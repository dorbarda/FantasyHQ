import Link from 'next/link';
import prepJson from '@/data/draft-prep.json';
import { seasonLabel } from '@/lib/season';

export const revalidate = 3600;

interface DraftPrep {
  season: number;
  draftDate: string | null; // ISO datetime, or null while undecided
  location: string;
  draftOrder: string[];     // owner names in pick order
  notes: string[];
}

const prep = prepJson as DraftPrep;

// ─── Countdown card ──────────────────────────────────────────────────────────

function CountdownCard() {
  if (!prep.draftDate) {
    return (
      <div className="rounded-2xl overflow-hidden bg-panel text-white px-6 py-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-accent mb-2">
          Draft Night
        </p>
        <p className="text-[24px] font-black">Date TBD</p>
        <p className="text-[13px] text-muted mt-2">
          Commissioner sets it in <code className="text-accent">data/draft-prep.json</code>
        </p>
      </div>
    );
  }

  const draftDate = new Date(prep.draftDate);
  const daysLeft = Math.max(0, Math.ceil((draftDate.getTime() - Date.now()) / 86_400_000));
  const dateLabel = draftDate.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const timeLabel = draftDate.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem',
  });

  return (
    <div className="rounded-2xl overflow-hidden bg-panel text-white px-6 py-8 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-accent mb-2">
        Draft Night
      </p>
      <p className="text-[48px] font-black leading-none tabular-nums">
        {daysLeft}
      </p>
      <p className="text-[13px] font-semibold text-accent mt-1">
        day{daysLeft !== 1 ? 's' : ''} to go
      </p>
      <p className="text-[14px] text-border mt-4">{dateLabel} · {timeLabel}</p>
      {prep.location && <p className="text-[13px] text-muted mt-1">{prep.location}</p>}
    </div>
  );
}

// ─── Draft order card ────────────────────────────────────────────────────────

function DraftOrderCard() {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <p className="text-[11px] font-black uppercase tracking-widest text-muted">Draft Order</p>
      </div>
      {prep.draftOrder.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-muted">
          Order not drawn yet — it appears here once the league decides.
        </p>
      ) : (
        <div className="divide-y divide-surface-secondary">
          {prep.draftOrder.map((owner, i) => (
            <div key={owner} className="flex items-center gap-3 px-5 py-2.5">
              <span className="text-[13px] font-black tabular-nums text-accent w-7">#{i + 1}</span>
              <span className="text-[14px] font-semibold text-foreground">{owner}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Notes card ──────────────────────────────────────────────────────────────

function NotesCard() {
  if (prep.notes.length === 0) return null;
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <p className="text-[11px] font-black uppercase tracking-widest text-muted">League Notes</p>
      </div>
      <ul className="px-5 py-4 flex flex-col gap-2">
        {prep.notes.map((note, i) => (
          <li key={i} className="text-[13px] text-secondary flex gap-2">
            <span className="text-accent shrink-0">•</span>
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Scouting links ──────────────────────────────────────────────────────────

const SCOUTING_LINKS = [
  {
    href: `/draft?year=${prep.season - 1}&view=value`,
    title: 'Last draft: hits & busts',
    desc: 'How every pick performed against its round benchmark',
    emoji: '🎯',
  },
  {
    href: `/draft?year=${prep.season - 1}`,
    title: `${seasonLabel(prep.season - 1)} draft board`,
    desc: 'Full board with pick grades from last season',
    emoji: '📋',
  },
  {
    href: '/records',
    title: 'All-time records',
    desc: 'Hall of fame, head-to-head, superlatives',
    emoji: '🏆',
  },
  {
    href: '/analysis',
    title: 'Season analytics',
    desc: 'Luck tables, category standings, efficiency',
    emoji: '🔬',
  },
];

function ScoutingGrid() {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-widest text-muted mb-3">
        Scouting Room
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SCOUTING_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-surface border border-border rounded-xl px-4 py-4 hover:border-accent transition-colors group"
          >
            <span className="text-[20px]">{link.emoji}</span>
            <p className="text-[14px] font-bold text-foreground mt-2 group-hover:text-accent transition-colors">
              {link.title}
            </p>
            <p className="text-[12px] text-muted mt-0.5">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DraftPrepPage() {
  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="type-page-title text-foreground">
          Draft Prep
        </h1>
        <p className="type-page-subtitle mt-1">
          Getting ready for the {seasonLabel(prep.season)} season
        </p>
      </div>

      <div className="flex flex-col gap-4 max-w-2xl">
        <CountdownCard />
        <DraftOrderCard />
        <NotesCard />
        <ScoutingGrid />
      </div>
    </div>
  );
}
