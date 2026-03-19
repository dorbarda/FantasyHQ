import { SeasonStats } from '@/lib/types';

interface SeasonStatsTableProps {
  stats: SeasonStats[];
}

export default function SeasonStatsTable({ stats }: SeasonStatsTableProps) {
  return (
    <div className="border border-[#eff3f4] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-[#eff3f4] bg-[#f7f9f9]">
              <th className="text-left px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-[#536471] w-[160px] sticky left-0 bg-[#f7f9f9]">
                Team
              </th>
              {['FGM','FGA','FTM','FTA','3PM','REB','AST','STL','BLK','TO','TD','PTS'].map(col => (
                <th key={col} className={`px-2 py-2 text-[11px] font-bold uppercase tracking-widest text-right ${
                  col === 'PTS' ? 'text-[#1d9bf0]' : 'text-[#536471]'
                }`}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((row, idx) => (
              <tr
                key={row.teamId}
                className={`
                  transition-colors cursor-default
                  ${idx < stats.length - 1 ? 'border-b border-[#eff3f4]' : ''}
                  hover:bg-[#f7f9f9]
                `}
              >
                <td className="px-4 py-2.5 sticky left-0 bg-white">
                  <p className="text-[13px] font-bold text-[#0f1419] truncate max-w-[148px]">{row.teamName}</p>
                  <p className="text-[11px] text-[#536471]">{row.ownerName}</p>
                </td>
                <td className="px-2 py-2.5 text-[13px] font-medium text-[#0f1419] text-right tabular-nums">{row.fgm.toLocaleString()}</td>
                <td className="px-2 py-2.5 text-[13px] font-medium text-[#536471] text-right tabular-nums">{row.fga.toLocaleString()}</td>
                <td className="px-2 py-2.5 text-[13px] font-medium text-[#0f1419] text-right tabular-nums">{row.ftm.toLocaleString()}</td>
                <td className="px-2 py-2.5 text-[13px] font-medium text-[#536471] text-right tabular-nums">{row.fta.toLocaleString()}</td>
                <td className="px-2 py-2.5 text-[13px] font-medium text-[#0f1419] text-right tabular-nums">{row.tpm.toLocaleString()}</td>
                <td className="px-2 py-2.5 text-[13px] font-medium text-[#0f1419] text-right tabular-nums">{row.reb.toLocaleString()}</td>
                <td className="px-2 py-2.5 text-[13px] font-medium text-[#0f1419] text-right tabular-nums">{row.ast.toLocaleString()}</td>
                <td className="px-2 py-2.5 text-[13px] font-medium text-[#0f1419] text-right tabular-nums">{row.stl.toLocaleString()}</td>
                <td className="px-2 py-2.5 text-[13px] font-medium text-[#0f1419] text-right tabular-nums">{row.blk.toLocaleString()}</td>
                <td className="px-2 py-2.5 text-[13px] font-medium text-[#f4212e] text-right tabular-nums">{row.to.toLocaleString()}</td>
                <td className="px-2 py-2.5 text-[13px] font-medium text-[#0f1419] text-right tabular-nums">{row.td}</td>
                <td className="px-2 py-2.5 text-[13px] font-bold text-[#1d9bf0] text-right tabular-nums">{row.pts.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-[#eff3f4] bg-[#f7f9f9]">
        <p className="text-[11px] text-[#536471]">Season cumulative totals · Swipe right for all columns · TO in red (lower is better) · TD = Triple Doubles</p>
      </div>
    </div>
  );
}
