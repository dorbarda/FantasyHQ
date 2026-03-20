import { hasEspnCredentials } from '@/lib/espn';
import { getDraftBoard, DRAFT_YEARS } from '@/lib/espn-draft';
import { DraftBoardData } from '@/lib/types';
import DraftBoard from '@/components/DraftBoard';
import DraftYearTabs from '@/components/DraftYearTabs';
import PlayerHistoryTab from '@/components/PlayerHistoryTab';

export const revalidate = 3600;

const DEFAULT_YEAR = Math.max(...DRAFT_YEARS.filter(y => y <= new Date().getFullYear()));

interface PageProps {
  searchParams: { year?: string; view?: string };
}

export default async function DraftPage({ searchParams }: PageProps) {
  if (!hasEspnCredentials()) {
    return (
      <div className="py-5">
        <h1 className="text-[28px] font-bold tracking-tight text-[#F0F4F8] mb-2">Draft Board</h1>
        <p className="text-[15px] text-[#94A3B8]">ESPN credentials required.</p>
      </div>
    );
  }

  const isHistory = searchParams.view === 'history';
  const requestedYear = parseInt(searchParams.year || String(DEFAULT_YEAR));
  const year = DRAFT_YEARS.includes(requestedYear) ? requestedYear : DEFAULT_YEAR;

  let data: DraftBoardData | null = null;
  let error = false;

  if (!isHistory) {
    try {
      data = await getDraftBoard(year);
    } catch (err) {
      console.error('Draft board fetch failed:', err);
      error = true;
    }
  }

  return (
    <div className="py-5">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-[28px] font-bold tracking-tight text-[#F0F4F8]">Draft Board</h1>
        <p className="text-[15px] text-[#94A3B8] font-medium">
          {isHistory
            ? 'Search a player to see their full draft history'
            : 'Pick grades based on season rank vs. draft position'}
        </p>
      </div>

      {/* Tab selector */}
      <div className="mb-5">
        <DraftYearTabs years={DRAFT_YEARS} currentYear={year} view={searchParams.view} />
      </div>

      {/* Player History view */}
      {isHistory && <PlayerHistoryTab />}

      {/* Draft Board view */}
      {!isHistory && (
        <>
          {error && (
            <p className="text-[15px] text-[#94A3B8]">Could not load draft data — try again later.</p>
          )}

          {data && data.picks.length === 0 && (
            <div className="border border-[#1E3050] rounded-lg px-6 py-10 text-center">
              <p className="text-[15px] font-bold text-[#F0F4F8]">Draft not yet held</p>
              <p className="text-[13px] text-[#94A3B8] mt-1">Check back once the {data.seasonLabel} draft is complete.</p>
            </div>
          )}

          {data && data.picks.length > 0 && (
            <>
              <div className="flex items-center gap-4 mb-4 text-[13px] text-[#94A3B8]">
                <span>{data.rounds} rounds · {data.picks.length} picks · {data.teams.length} teams</span>
                {!data.hasStats && (
                  <span className="text-[#FB923C] font-medium">Season in progress — grades pending</span>
                )}
              </div>
              <DraftBoard data={data} />
            </>
          )}
        </>
      )}
    </div>
  );
}
