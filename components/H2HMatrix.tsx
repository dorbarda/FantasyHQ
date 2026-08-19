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
  if (rec.wins > rec.losses) return 'text-positive-bright font-semibold';
  if (rec.wins < rec.losses) return 'text-negative-bright font-semibold';
  return 'text-muted';
}

function cellBg(rec: H2HRecord): string {
  if (rec.wins > rec.losses) return 'bg-positive-bright/[0.06]';
  if (rec.wins < rec.losses) return 'bg-negative-bright/[0.04]';
  return '';
}

export default function H2HMatrix({ h2hMap, ownerNames }: H2HMatrixProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: `${160 + ownerNames.length * 72}px` }}>
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="sticky left-0 bg-surface-secondary px-4 py-2 text-left w-[160px]">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">vs.</span>
              </th>
              {ownerNames.map(col => (
                <th key={col} className="px-2 py-2 text-center min-w-[72px]">
                  <span className="text-[11px] font-semibold text-muted whitespace-nowrap">
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
                className={rowIdx < ownerNames.length - 1 ? 'border-b border-border' : ''}
              >
                <td className="sticky left-0 bg-surface px-4 py-2.5 border-r border-border">
                  <p className="text-[13px] font-semibold text-foreground whitespace-nowrap">
                    {shortName(row)}
                  </p>
                </td>
                {ownerNames.map(col => {
                  if (row === col) {
                    return (
                      <td key={col} className="px-2 py-2.5 text-center bg-surface-secondary">
                        <span className="text-[14px] text-border font-bold">—</span>
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
      <div className="px-4 py-2 border-t border-border bg-surface-secondary flex items-center gap-4 flex-wrap">
        <span className="text-[11px] text-muted">Read as: Row owner&apos;s W&#8211;L record <em>against</em> column owner</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-positive-bright/10" /><span className="text-[11px] text-muted">Winning</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-negative-bright/10" /><span className="text-[11px] text-muted">Losing</span></div>
        </div>
      </div>
    </div>
  );
}
