import { hasEspnCredentials } from '@/lib/espn';
import { getAllRecords } from '@/lib/espn-records';
import { RecordsData } from '@/lib/types';
import SuperlativesGrid from '@/components/SuperlativesGrid';
import H2HMatrix from '@/components/H2HMatrix';
import HallOfFame from '@/components/HallOfFame';

export const revalidate = 3600;

export default async function RecordsPage() {
  if (!hasEspnCredentials()) {
    return (
      <div className="py-5">
        <h1 className="text-[28px] font-bold tracking-tight text-[#111827] mb-2">Records</h1>
        <p className="text-[15px] text-[#6B7280]">
          ESPN credentials required to compute all-time records.
        </p>
      </div>
    );
  }

  let data: RecordsData | null = null;
  let error = false;

  try {
    data = await getAllRecords();
  } catch (err) {
    console.error('Records fetch failed:', err);
    error = true;
  }

  if (error || !data) {
    return (
      <div className="py-5">
        <h1 className="text-[28px] font-bold tracking-tight text-[#111827] mb-2">Records</h1>
        <p className="text-[15px] text-[#6B7280]">Could not load records — try again later.</p>
      </div>
    );
  }

  return (
    <div className="py-5">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[28px] font-bold tracking-tight text-[#111827]">Records</h1>
        <p className="text-[15px] text-[#6B7280] font-medium">
          All-time stats across every season
        </p>
      </div>

      {/* ── Hall of Fame ──────────────────────────────────────── */}
      <section className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] mb-3">
          Hall of Fame
        </p>
        <HallOfFame careers={data.hallOfFame} />
      </section>

      <div className="border-b border-[#E4E7ED] mb-5" />

      {/* ── All-Time Records ──────────────────────────────────── */}
      <section className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] mb-3">
          All-Time Records
        </p>
        <SuperlativesGrid superlatives={data.superlatives} />
      </section>

      <div className="border-b border-[#E4E7ED] mb-5" />

      {/* ── Head-to-Head Matrix ───────────────────────────────── */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280] mb-3">
          Head-to-Head · All Time
        </p>
        <H2HMatrix h2hMap={data.h2hMap} ownerNames={data.ownerNames} />
      </section>
    </div>
  );
}
