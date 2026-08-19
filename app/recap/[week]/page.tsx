import { notFound } from 'next/navigation';
import RecapView from '@/components/RecapView';
import { computeWeeklyRecap, listRecapWeeks } from '@/lib/recap';
import { loadRecapRows, loadAddsForWeek } from '@/lib/recap-data';
import { CURRENT_SEASON_LABEL } from '@/lib/season';

export const revalidate = 3600;

export async function generateStaticParams() {
  const rows = await loadRecapRows();
  return listRecapWeeks(rows).map(week => ({ week: String(week) }));
}

export default async function WeekRecapPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const week = parseInt((await params).week, 10);
  const rows = await loadRecapRows();
  const recap = Number.isFinite(week)
    ? computeWeeklyRecap(rows, week, { addsThisWeek: loadAddsForWeek(week) })
    : null;
  if (!recap) notFound();

  const weeks = listRecapWeeks(rows);
  const idx = weeks.indexOf(week);

  return (
    <RecapView
      recap={recap}
      seasonLabel={CURRENT_SEASON_LABEL}
      prevWeek={weeks[idx + 1] ?? null}
      nextWeek={idx > 0 ? weeks[idx - 1] : null}
    />
  );
}
