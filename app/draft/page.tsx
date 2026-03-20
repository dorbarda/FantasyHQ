import { hasEspnCredentials } from '@/lib/espn';
import { getDraftBoard, DRAFT_YEARS } from '@/lib/espn-draft';
import { DraftBoardData } from '@/lib/types';
import DraftBoard from '@/components/DraftBoard';
import DraftYearTabs from '@/components/DraftYearTabs';

export const revalidate = 3600;

const DEFAULT_YEAR = Math.max(...DRAFT_YEARS.filter(y => y <= new Date().getFullYear()));

interface PageProps {
  searchParams: { year?: string };
}

export default async function DraftPage({ searchParams }: PageProps) {
  if (!hasEspnCredentials()) {
    return (
      <div className="py-5">
        <h1 className="text-[28px] font-bold tracking-tight text-[#111827] mb-2">Draft Board</h1>
        <p className="text-[15px] text-[#6B7280]">ESPN credentials required.</p>
      </div>
    );
  }

  const requestedYear = parseInt(searchParams.year || String(DEFAULT_YEAR));
  const year = DRAFT_YEARS.includes(requestedYear) ? requestedYear : DEFAULT_YEAR;

  let data: DraftBoardData | null = null;
  let error = false;

  try {
    data = await getDraftBoard(year);
  } catch (err) {
    console.error('Draft board fetch failed:', err);
    error = true;
  }

  return (
    <div className="py-5">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-[28px] font-bold tracking-tight text-[#111827]">Draft Board</h1>
        <p className="text-[15px] text-[#6B7280] font-medium">
          Pick grades based on season rank vs. draft position
        </p>
      </div>

      {/* Year selector */}
      <div className="mb-5">
        <DraftYearTabs years={DRAFT_YEARS} currentYear={year} />
      </div>

      {error && (
        <p className="text-[15px] text-[#6B7280]">Could not load draft data — try again later.</p>
      )}

      {data && data.picks.length === 0 && (
        <div className="border border-[#E4E7ED] rounded-lg px-6 py-10 text-center">
          <p className="text-[15px] font-bold text-[#111827]">Draft not yet held</p>
          <p className="text-[13px] text-[#6B7280] mt-1">Check back once the {data.seasonLabel} draft is complete.</p>
        </div>
      )}

      {data && data.picks.length > 0 && (
        <>
          {/* Summary row */}
          <div className="flex items-center gap-4 mb-4 text-[13px] text-[#6B7280]">
            <span>{data.rounds} rounds · {data.picks.length} picks · {data.teams.length} teams</span>
            {!data.hasStats && (
              <span className="text-[#D97706] font-medium">Season in progress — grades pending</span>
            )}
          </div>

          <DraftBoard data={data} />
        </>
      )}
    </div>
  );
}
