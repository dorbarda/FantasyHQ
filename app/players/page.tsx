import playersData from '@/data/players.json';
import { Player } from '@/lib/types';
import PlayerTable from '@/components/PlayerTable';

export default function PlayersPage() {
  const players = playersData as Player[];

  return (
    <div className="py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0f1419]">Players</h1>
          <p className="text-[15px] text-[#536471] font-medium">Top fantasy performers this week</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ba7c] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ba7c]"></span>
          </span>
          <span className="text-[12px] font-bold text-[#00ba7c]">Live · Week 18</span>
        </div>
      </div>

      {/* Key */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#1d9bf0] text-white">G</span>
          <span className="text-[11px] text-[#536471]">Guard</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#00ba7c] text-white">F</span>
          <span className="text-[11px] text-[#536471]">Forward</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ff7a00] text-white">C</span>
          <span className="text-[11px] text-[#536471]">Center</span>
        </div>
        <span className="text-[11px] text-[#536471] ml-1">· FP = Fantasy Points total</span>
      </div>

      <div className="mb-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#536471]">
          Weekly Leaders
        </p>
      </div>

      <PlayerTable players={players} />
    </div>
  );
}
