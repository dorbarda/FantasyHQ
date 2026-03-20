import { hasEspnCredentials, getPlayers } from '@/lib/espn';
import playersJson from '@/data/players.json';
import { Player } from '@/lib/types';
import PlayerTable from '@/components/PlayerTable';

export const revalidate = 1800;

export default async function PlayersPage() {
  let players: Player[];

  if (hasEspnCredentials()) {
    try {
      players = await getPlayers();
    } catch (err) {
      console.error('ESPN fetch failed, using static data:', err);
      players = playersJson as Player[];
    }
  } else {
    players = playersJson as Player[];
  }

  return (
    <div className="py-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#F0F4F8]">Players</h1>
          <p className="text-[15px] text-[#94A3B8] font-medium">Top fantasy performers this week</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]"></span>
          </span>
          <span className="text-[12px] font-bold text-[#34D399]">Live</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#C8956C] text-white">G</span>
          <span className="text-[11px] text-[#94A3B8]">Guard</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#34D399] text-white">F</span>
          <span className="text-[11px] text-[#94A3B8]">Forward</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FB923C] text-white">C</span>
          <span className="text-[11px] text-[#94A3B8]">Center</span>
        </div>
        <span className="text-[11px] text-[#94A3B8] ml-1">· FP = Fantasy Points total</span>
      </div>

      <div className="mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">
          Weekly Leaders
        </p>
      </div>

      <PlayerTable players={players} />
    </div>
  );
}
