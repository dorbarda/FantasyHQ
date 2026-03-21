import { H2HRecord } from '@/lib/types';

interface H2HMatrixProps {
  h2hMap: Record<string, Record<string, H2HRecord>>;
  ownerNames: string[];
}

function shortName(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function cellColor(rec: H2HRecord): string {
  if (rec.wins > rec.losses) return 'text-[#34D399] font-semibold';
  if (rec.wins < rec.losses) return 'text-[#F87171] font-semibold';
  return 'text-[#94A3B8]';
}

function cellBg(rec: H2HRecord): string {
  if (rec.wins > rec.losses) return 'bg-[#34D399]/[0.06]';
  if (rec.wins < rec.losses) return 'bg-[#F87171]/[0.04]';
  return '';
}

export default function H2HMatrix({ h2hMap, ownerNames }: H2HMatrixProps) {
  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: `${160 + ownerNames.length * 72}px` }}>
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F1F5F9]">
              <th className="sticky left-0 bg-[#F1F5F9] px-4 py-2 text-left w-[160px]">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">vs.</span>
              </th>
              {ownerNames.map(col => (
                <th key={col} className="px-2 py-2 text-center min-w-[72px]">
                  <span className="text-[11px] font-semibold text-[#94A3B8] whitespace-nowrap">
                    {shortName(col)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ownerNames.map((row, rowIdx) => (
              <tr
                key={row}
                className={rowIdx < ownerNames.length - 1 ? 'border-b border-[#E2E8F0]' : ''}
              >
                <td className="sticky left-0 bg-white px-4 py-2.5 border-r border-[#E2E8F0]">
                  <p className="text-[13px] font-semibold text-[#0F172A] whitespace-nowrap">
                    {shortName(row)}
                  </p>
                </td>
                {ownerNames.map(col => {
                  if (row === col) {
                    return (
                      <td key={col} className="px-2 py-2.5 text-center bg-[#F1F5F9]">
                        <span className="text-[14px] text-[#E4E7ED] font-bold">—</span>
                      </td>
                    );
                  }
                  const rec = h2hMap[row]?.[col] ?? { wins: 0, losses: 0 };
                  return (
                    <td key={col} className={`px-2 py-2.5 text-center ${cellBg(rec)}`}>
                      <span className={`text-[13px] tabular-nums ${cellColor(rec)}`}>
                        {rec.wins}–{rec.losses}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-[#E2E8F0] bg-[#F1F5F9] flex items-center gap-4 flex-wrap">
        <span className="text-[11px] text-[#94A3B8]">Read as: Row owner&apos;s W&#8211;L record <em>against</em> column owner</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#34D399]/10" /><span className="text-[11px] text-[#94A3B8]">Winning</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#F87171]/10" /><span className="text-[11px] text-[#94A3B8]">Losing</span></div>
        </div>
      </div>
    </div>
  );
}
