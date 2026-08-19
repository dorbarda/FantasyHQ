import RecapView from '@/components/RecapView';
import { computeWeeklyRecap, listRecapWeeks, latestRecapWeek } from '@/lib/recap';
import { loadRecapRows, loadAddsForWeek } from '@/lib/recap-data';
import { loadHighlightsForWeek } from '@/lib/highlights-data';
import { CURRENT_SEASON_LABEL } from '@/lib/season';

export const revalidate = 3600;

export default async function LatestRecapPage() {
  const rows = await loadRecapRows();
  const week = latestRecapWeek(rows);
  const recap = week ? computeWeeklyRecap(rows, week, { addsThisWeek: loadAddsForWeek(week) }) : null;

  if (!recap || week === null) {
    return (
      <div className="min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="type-page-title text-foreground mb-2">Weekly Recap</h1>
        <p className="type-page-subtitle">
          No completed week yet — the recap appears once a matchup week finishes.
        </p>
      </div>
    );
  }

  const weeks = listRecapWeeks(rows);
  const idx = weeks.indexOf(week);

  return (
    <RecapView
      recap={recap}
      seasonLabel={CURRENT_SEASON_LABEL}
      prevWeek={weeks[idx + 1] ?? null}
      nextWeek={idx > 0 ? weeks[idx - 1] : null}
      highlights={loadHighlightsForWeek(week)}
    />
  );
}
