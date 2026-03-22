'use client';

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer, LabelList, ReferenceLine,
} from 'recharts';

export interface CareerPoint {
  seasonLabel: string;
  position: number;
  totalTeams: number;
  teamName: string;
  wins: number;
  losses: number;
  isChampion: boolean;
  isRunnerUp: boolean;
  isThird: boolean;
  isLast: boolean;
}

function barColor(p: CareerPoint): string {
  if (p.isChampion)  return '#F59E0B';
  if (p.isRunnerUp)  return '#94A3B8';
  if (p.isThird)     return '#C8956C';
  if (p.isLast)      return '#F87171';
  return '#60A5FA';
}

function posLabel(p: CareerPoint): string {
  if (p.isChampion) return '🏆';
  if (p.isRunnerUp) return '🥈';
  if (p.isThird)    return '🥉';
  if (p.isLast)     return '💀';
  return `#${p.position}`;
}

interface TooltipPayload {
  payload: CareerPoint;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-lg text-left">
      <p className="text-[12px] font-bold text-[#0F172A] mb-1">{label}</p>
      <p className="text-[11px] text-[#475569]">{d.teamName}</p>
      <p className="text-[11px] text-[#0F172A] font-semibold mt-1">
        #{d.position} of {d.totalTeams} &nbsp;·&nbsp; {d.wins}–{d.losses}
      </p>
    </div>
  );
}

export default function TeamCareerChart({ data }: { data: CareerPoint[] }) {
  const maxTeams = Math.max(...data.map(d => d.totalTeams));
  // displayValue: higher = better finish (1st → maxTeams, last → 1)
  const chartData = data.map(d => ({
    ...d,
    displayValue: d.totalTeams - d.position + 1,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={chartData} margin={{ top: 28, right: 12, bottom: 0, left: -24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis
          dataKey="seasonLabel"
          tick={{ fill: '#94A3B8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, maxTeams]}
          ticks={[]}
          axisLine={false}
          tickLine={false}
          width={0}
        />
        <Tooltip content={<CustomTooltip />} />

        <Bar dataKey="displayValue" radius={[6, 6, 0, 0]} isAnimationActive={false} maxBarSize={52}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={barColor(entry)} fillOpacity={0.85} />
          ))}
          <LabelList
            dataKey="position"
            position="top"
            content={(props) => {
              const { x, y, width, index } = props as { x?: number; y?: number; width?: number; index?: number };
              if (x == null || y == null || width == null || index == null) return null;
              const entry = chartData[index];
              if (!entry) return null;
              return (
                <text
                  x={(x as number) + (width as number) / 2}
                  y={(y as number) - 6}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill="#475569"
                >
                  {posLabel(entry)}
                </text>
              );
            }}
          />
        </Bar>

        {/* Win-rate overlay line */}
        <Line
          type="monotone"
          dataKey="displayValue"
          stroke="transparent"
          dot={false}
          activeDot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
