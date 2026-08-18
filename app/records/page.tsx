import { hasEspnCredentials } from '@/lib/espn';
import { getAllRecords } from '@/lib/espn-records';
import { readSnapshot, formatSnapshotDate } from '@/lib/snapshots';
import { RecordsData } from '@/lib/types';
import SuperlativesGrid from '@/components/SuperlativesGrid';
import H2HMatrix from '@/components/H2HMatrix';
import HallOfFame from '@/components/HallOfFame';

export const revalidate = 3600;

export default async function RecordsPage() {
  let data: RecordsData | null = null;
  let asOf: string | null = null;

  const snap = readSnapshot<RecordsData>('records');
  if (snap) {
    data = snap.data;
    asOf = snap.generatedAt;
  } else if (hasEspnCredentials()) {
    try {
      data = await getAllRecords();
    } catch (err) {
      console.error('Records fetch failed:', err);
    }
  } else {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-[#0F172A] mb-2">Records</h1>
        <p className="text-[14px] text-[#475569] mt-1">
          ESPN credentials required to compute all-time records.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-[#0F172A] mb-2">Records</h1>
        <p className="text-[14px] text-[#475569] mt-1">Could not load records — try again later.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-[#0F172A]">Records</h1>
        <p className="text-[14px] text-[#475569] mt-1">
          All-time stats across every season
          {asOf && <span className="text-[#94A3B8]"> · updated {formatSnapshotDate(asOf)}</span>}
        </p>
      </div>

      {/* ── Hall of Fame ──────────────────────────────────────── */}
      <section className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
          Hall of Fame
        </p>
        <HallOfFame careers={data.hallOfFame} />
      </section>

      <div className="border-b border-[#E2E8F0] mb-5" />

      {/* ── All-Time Records ──────────────────────────────────── */}
      <section className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
          All-Time Records
        </p>
        <SuperlativesGrid superlatives={data.superlatives} />
      </section>

      <div className="border-b border-[#E2E8F0] mb-5" />

      {/* ── Head-to-Head Matrix ───────────────────────────────── */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-3">
          Head-to-Head · All Time
        </p>
        <H2HMatrix h2hMap={data.h2hMap} ownerNames={data.ownerNames} />
      </section>
    </div>
  );
}
