import { hasEspnCredentials, getPlayers } from '@/lib/espn';
import playersJson from '@/data/players.json';
import type { Player } from '@/lib/types';
import PlayersClient from '@/components/PlayersClient';

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

  const totalPlayers = players.length;
  const positions = { G: 0, F: 0, C: 0 };
  for (const p of players) {
    if (p.position in positions) positions[p.position as keyof typeof positions]++;
  }

  return (
    <div className="min-h-screen bg-[#071120] py-6 px-4 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-[28px] font-black tracking-tight text-[#F0F4F8]">Players</h1>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#34D399]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]" />
            </span>
            Season Averages
          </span>
        </div>
        <p className="text-[14px] text-[#64748B]">
          All rostered players ranked by fantasy points per game
        </p>

        {/* Summary chips */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#0B1628] border border-[#1E3050] rounded-full px-3 py-1">
            <span className="text-[11px] font-semibold text-[#94A3B8]">{totalPlayers} players</span>
          </div>
          {(Object.entries(positions) as [string, number][]).map(([pos, count]) => {
            const colors: Record<string, string> = { G: '#C8956C', F: '#10B981', C: '#3B82F6' };
            return (
              <div
                key={pos}
                className="flex items-center gap-1.5 bg-[#0B1628] border border-[#1E3050] rounded-full px-3 py-1"
              >
                <span
                  className="inline-flex items-center justify-center text-[9px] font-bold w-4 h-4 rounded"
                  style={{ backgroundColor: colors[pos] ?? '#94A3B8', color: '#fff' }}
                >
                  {pos}
                </span>
                <span className="text-[11px] font-semibold text-[#94A3B8]">{count}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1 text-[11px] text-[#475569] bg-[#0B1628] border border-[#1E3050] rounded-full px-3 py-1">
            <span className="font-semibold text-[#C8956C]">FP/g</span>
            <span>=</span>
            <span>PTS + REB×1.2 + AST×1.5 + 3PM×3</span>
          </div>
        </div>
      </div>

      {/* Client component handles filtering + display */}
      <PlayersClient players={players} />
    </div>
  );
}
