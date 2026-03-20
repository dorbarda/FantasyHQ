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
  if (rec.wins > rec.losses) return 'text-[#059669] font-semibold';
  if (rec.wins < rec.losses) return 'text-[#DC2626] font-semibold';
  return 'text-[#6B7280]';
}

function cellBg(rec: H2HRecord): string {
  if (rec.wins > rec.losses) return 'bg-[#059669]/[0.06]';
  if (rec.wins < rec.losses) return 'bg-[#DC2626]/[0.04]';
  return '';
}

export default function H2HMatrix({ h2hMap, ownerNames }: H2HMatrixProps) {
  return (
    <div className="border border-[#E4E7ED] rounded-lg overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: `${160 + ownerNames.length * 72}px` }}>
          <thead>
            <tr className="border-b border-[#E4E7ED] bg-[#F3F4F6]">
              <th className="sticky left-0 bg-[#F3F4F6] px-4 py-2 text-left w-[160px]">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">vs.</span>
              </th>
              {ownerNames.map(col => (
                <th key={col} className="px-2 py-2 text-center min-w-[72px]">
                  <span className="text-[11px] font-semibold text-[#6B7280] whitespace-nowrap">
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
                className={rowIdx < ownerNames.length - 1 ? 'border-b border-[#E4E7ED]' : ''}
              >
                <td className="sticky left-0 bg-white px-4 py-2.5 border-r border-[#E4E7ED]">
                  <p className="text-[13px] font-semibold text-[#111827] whitespace-nowrap">
                    {shortName(row)}
                  </p>
                </td>
                {ownerNames.map(col => {
                  if (row === col) {
                    return (
                      <td key={col} className="px-2 py-2.5 text-center bg-[#F3F4F6]">
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
      <div className="px-4 py-2 border-t border-[#E4E7ED] bg-[#F3F4F6] flex items-center gap-4 flex-wrap">
        <span className="text-[11px] text-[#6B7280]">Read as: Row owner&apos;s W&#8211;L record <em>against</em> column owner</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#059669]/10" /><span className="text-[11px] text-[#6B7280]">Winning</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#DC2626]/10" /><span className="text-[11px] text-[#6B7280]">Losing</span></div>
        </div>
      </div>
    </div>
  );
}
