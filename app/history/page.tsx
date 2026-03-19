import historyData from '@/data/history.json';
import { HistoryEntry } from '@/lib/types';

export default function HistoryPage() {
  const history = historyData as HistoryEntry[];

  return (
    <div className="py-5">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[28px] font-bold tracking-tight text-[#0f1419]">History</h1>
        <p className="text-[15px] text-[#536471] font-medium">Past champions &amp; prize winners</p>
      </div>

      <div className="flex flex-col gap-5">
        {history.map((season, idx) => (
          <div key={season.season}>
            {/* Season card */}
            <div className="border border-[#eff3f4] rounded-2xl overflow-hidden">
              {/* Season header */}
              <div className="px-4 py-3 border-b border-[#eff3f4] bg-[#f7f9f9] flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">
                  {season.season} Season
                </p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">
                  MVP: {season.mvpPlayer}
                </p>
              </div>

              {/* Champion row */}
              <div className="px-4 py-3 border-b border-[#eff3f4]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#ff7a00]/10 border border-[#ff7a00]/20 shrink-0">
                    <span className="text-[18px]">🏆</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-bold tracking-tight text-[#0f1419] truncate">
                        {season.champion.teamName}
                      </p>
                      <span className="text-[10px] font-bold text-[#ff7a00] bg-[#ff7a00]/10 rounded px-1.5 py-0.5 shrink-0">
                        Champion
                      </span>
                    </div>
                    <p className="text-[13px] text-[#536471] font-medium">
                      {season.champion.ownerName} · {season.champion.record} · {season.champion.finalScore.toLocaleString('en-US', { minimumFractionDigits: 1 })} pts
                    </p>
                  </div>
                </div>
              </div>

              {/* Runner-up row */}
              <div className="px-4 py-3 border-b border-[#eff3f4]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#f7f9f9] border border-[#eff3f4] shrink-0">
                    <span className="text-[18px]">🥈</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-bold tracking-tight text-[#0f1419] truncate">
                        {season.runnerUp.teamName}
                      </p>
                      <span className="text-[10px] font-bold text-[#536471] bg-[#f7f9f9] border border-[#eff3f4] rounded px-1.5 py-0.5 shrink-0">
                        Runner-up
                      </span>
                    </div>
                    <p className="text-[13px] text-[#536471] font-medium">
                      {season.runnerUp.ownerName} · {season.runnerUp.record}
                    </p>
                  </div>
                </div>
              </div>

              {/* Prizes */}
              <div className="px-4 py-3 border-b border-[#eff3f4]">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#536471] mb-2">
                  Prize Board
                </p>
                <div className="flex flex-col gap-1.5">
                  {season.prizes.map((prize) => (
                    <div key={prize.place} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-[#536471] w-8">{prize.place}</span>
                        <span className="text-[14px] font-medium text-[#0f1419]">{prize.ownerName}</span>
                      </div>
                      <span className={`text-[14px] font-bold ${prize.place === 'Last' ? 'text-[#f4212e]' : 'text-[#00ba7c]'}`}>
                        {prize.prize}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="px-4 py-3">
                <p className="text-[13px] text-[#536471] font-medium italic">
                  &ldquo;{season.notes}&rdquo;
                </p>
              </div>
            </div>

            {idx < history.length - 1 && (
              <div className="border-b border-[#eff3f4] mt-5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
