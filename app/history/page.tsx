import { hasEspnCredentials } from '@/lib/espn';
import { getAllHistoricalSeasons } from '@/lib/espn-history';
import { readSnapshot } from '@/lib/snapshots';
import overridesJson from '@/data/history.json';
import { HistoricalSeason, SeasonOverride } from '@/lib/types';
import SeasonCard from '@/components/SeasonCard';

export const revalidate = 86400; // historical data — revalidate once a day

export default async function HistoryPage() {
  const overrides = overridesJson as SeasonOverride[];

  let seasons: HistoricalSeason[] = [];

  const snap = readSnapshot<HistoricalSeason[]>('history');
  if (snap) {
    seasons = snap.data;
  } else if (hasEspnCredentials()) {
    try {
      seasons = await getAllHistoricalSeasons();
    } catch (err) {
      console.error('ESPN history fetch failed:', err);
    }
  }

  // If ESPN is unavailable, show skeleton seasons from overrides so the page isn't blank
  if (seasons.length === 0) {
    seasons = overrides.map(o => ({
      year: o.year,
      seasonLabel: `${o.year - 1}-${String(o.year).slice(2)}`,
      champion: null,
      runnerUp: null,
      lastPlace: null,
      finalStandings: [],
      mvpPlayer: o.mvpPlayer,
      notes: o.notes,
    }));
  }

  // Merge manual overrides (mvpPlayer, notes) into ESPN data
  const merged = seasons.map(season => {
    const override = overrides.find(o => o.year === season.year);
    return {
      ...season,
      mvpPlayer: override?.mvpPlayer || season.mvpPlayer,
      notes: override?.notes || season.notes,
    };
  });

  // Most recent first
  merged.sort((a, b) => b.year - a.year);

  // ── Dynasty stats ──────────────────────────────────────────────────────────
  const champCount: Record<string, number> = {};
  for (const s of merged) {
    if (s.champion?.ownerName) {
      champCount[s.champion.ownerName] = (champCount[s.champion.ownerName] ?? 0) + 1;
    }
  }
  const dynastyRanking = Object.entries(champCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Back-to-back detection: same champion owner in consecutive seasons
  // merged is sorted most-recent first; we look at [i] vs [i+1]
  const backToBackSet = new Set<number>();
  for (let i = 0; i < merged.length - 1; i++) {
    const curr = merged[i].champion?.ownerName;
    const prev = merged[i + 1].champion?.ownerName;
    if (curr && prev && curr === prev) {
      backToBackSet.add(merged[i].year); // current year is a repeat
    }
  }

  // Shame leaderboard: who has the most last-place finishes
  const shameCount: Record<string, number> = {};
  for (const s of merged) {
    if (s.lastPlace?.ownerName) {
      shameCount[s.lastPlace.ownerName] = (shameCount[s.lastPlace.ownerName] ?? 0) + 1;
    }
  }
  const shameLeader = Object.entries(shameCount).sort(([, a], [, b]) => b - a)[0] ?? null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 sm:px-6 lg:px-8 py-6">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-[#0F172A]">History</h1>
        <p className="text-[14px] text-[#475569] mt-1">
          {merged.length} season{merged.length !== 1 ? 's' : ''} · Champions &amp; final standings
        </p>
      </div>

      {/* ── Dynasty + Shame leaderboards ──────────────────────────────── */}
      {(dynastyRanking.length > 0 || shameLeader) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">

          {/* Championship leaderboard */}
          {dynastyRanking.length > 0 && (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl px-4 pt-4 pb-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
                🏆 All-Time Champions
              </p>
              <div className="flex flex-col gap-2">
                {dynastyRanking.map(([owner, count], i) => (
                  <div key={owner} className="flex items-center gap-2.5">
                    <span
                      className="text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: i === 0 ? '#D97706' : i === 1 ? '#94A3B8' : '#C8956C' }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[14px] font-semibold text-[#0F172A] flex-1 min-w-0 truncate">{owner}</span>
                    <span className="text-[13px] font-black tabular-nums text-[#D97706]">
                      {count} {count === 1 ? 'title' : 'titles'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shame leaderboard */}
          {shameLeader && (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl px-4 pt-4 pb-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
                🚽 Toilet Bowl Hall of Shame
              </p>
              <div className="flex flex-col gap-2">
                {Object.entries(shameCount)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([owner, count], i) => (
                    <div key={owner} className="flex items-center gap-2.5">
                      <span
                        className="text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: i === 0 ? '#DC2626' : '#EF4444' }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-[14px] font-semibold text-[#0F172A] flex-1 min-w-0 truncate">{owner}</span>
                      <span className="text-[13px] font-black tabular-nums text-[#DC2626]">
                        {count}× last
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Season cards ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-5">
        {merged.map(season => (
          <SeasonCard
            key={season.year}
            season={season}
            isBackToBack={backToBackSet.has(season.year)}
          />
        ))}
      </div>
    </div>
  );
}
