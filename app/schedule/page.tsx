import Link from 'next/link';
import ScheduleMatrix from '@/components/ScheduleMatrix';
import { loadScheduleSeason } from '@/lib/schedule-data';
import { weekFromSeason, currentWeekFor, weekCountOf } from '@/lib/espn-schedule';
import { CURRENT_SEASON_LABEL } from '@/lib/season';

export const revalidate = 3600;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-6">{children}</div>
  );
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const season = await loadScheduleSeason();

  if (!season) {
    return (
      <Shell>
        <h1 className="type-page-title text-foreground mb-2">NBA Schedule</h1>
        <p className="type-page-subtitle">
          Schedule data needs ESPN credentials — it appears once the nightly
          snapshot runs, or when <code className="text-secondary">ESPN_S2</code>,{' '}
          <code className="text-secondary">SWID</code> and{' '}
          <code className="text-secondary">LEAGUE_ID</code> are set.
        </p>
      </Shell>
    );
  }

  // Default to the week we're actually in, worked out from today's date. ESPN's
  // own currentMatchupPeriod reported the last week of a season that hadn't
  // started, which opened the page on week 21 of an empty season.
  const currentWeek = currentWeekFor(season);
  const { week: weekParam } = await searchParams;
  const requested = weekParam ? parseInt(weekParam, 10) : NaN;
  const week = Number.isNaN(requested) ? currentWeek : requested;

  const data = weekFromSeason(season, week) ?? weekFromSeason(season, currentWeek);

  if (!data) {
    return (
      <Shell>
        <h1 className="type-page-title text-foreground mb-2">NBA Schedule</h1>
        <p className="type-page-subtitle">
          No schedule for week {week} — the season runs weeks 1–{weekCountOf(season)}.
        </p>
      </Shell>
    );
  }

  const isCurrentWeek = data.week === data.currentWeek;
  const prevWeek = data.week > 1 ? data.week - 1 : null;
  const nextWeek = data.week < data.maxWeek ? data.week + 1 : null;
  // Every game appears on two teams' rows, so summing gameCount double-counts:
  // an 11-game night was reported as "22 games".
  const totalGames = data.rows.reduce((n, r) => n + r.gameCount, 0) / 2;

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="type-page-title text-foreground">NBA Schedule</h1>
          <p className="type-page-subtitle mt-1">
            Week {data.week} · {totalGames} {totalGames === 1 ? 'game' : 'games'} · {CURRENT_SEASON_LABEL}
            {isCurrentWeek ? ' · Current' : ''}
          </p>
        </div>
      </div>

      {/* Week navigation — same shape as /matchups so the two pages feel paired */}
      <div className="flex items-center justify-center gap-6 mb-6 bg-surface border border-border rounded-xl px-4 py-3">
        {prevWeek ? (
          <Link
            href={`/schedule?week=${prevWeek}`}
            className="text-[13px] text-secondary hover:text-muted transition-colors inline-flex items-center min-h-[32px] px-2"
          >
            ← Wk {prevWeek}
          </Link>
        ) : (
          <span className="w-14" />
        )}
        <span className="text-[13px] font-semibold text-muted">
          Week {data.week}{isCurrentWeek ? ' · Current' : ''}
        </span>
        {nextWeek ? (
          <Link
            href={`/schedule?week=${nextWeek}`}
            className="text-[13px] text-secondary hover:text-muted transition-colors inline-flex items-center min-h-[32px] px-2"
          >
            Wk {nextWeek} →
          </Link>
        ) : (
          <span className="w-14" />
        )}
      </div>

      <ScheduleMatrix week={data} />

      <p className="text-[12px] text-muted mt-4 max-w-[70ch]">
        Games per NBA team for the fantasy week, heaviest schedule first. More games
        means more chances to score — a four-game team is worth streaming for, a
        two-game team is worth benching. Back-to-backs are counted inside the week
        only.
      </p>
    </Shell>
  );
}
