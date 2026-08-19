import { getTeamMeta } from '@/lib/team-meta';
import { bestTextOn } from '@/lib/contrast';
import { getInitials } from '@/lib/owner-meta';
import type { PickStatus } from '@/lib/playoff-analytics';

export function Avatar({
  name,
  size = 24,
  color = 'var(--foreground-muted)',
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  return (
    <div
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        color: color.startsWith('#') ? bestTextOn(color) : '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 700,
        letterSpacing: '0.02em',
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

export function TeamMark({
  team,
  size = 32,
}: {
  team: string;
  size?: number;
}) {
  const meta = getTeamMeta(team);
  return (
    <div
      title={team}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: meta.primary,
        color: bestTextOn(meta.primary),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.32,
        fontWeight: 800,
        border: `2px solid ${meta.secondary}`,
        flexShrink: 0,
      }}
    >
      {meta.abbr}
    </div>
  );
}

const STREAK_COLORS: Record<string, string> = {
  exact: 'var(--gold)',
  correct: 'var(--positive)',
  wrong: 'var(--negative)',
  wrong43: 'var(--negative)',
};

export function Streak({
  items,
  max = 8,
}: {
  items: PickStatus[];
  max?: number;
}) {
  const trimmed = items.slice(-max);
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {trimmed.map((s, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 14,
            borderRadius: 2,
            background: s ? (STREAK_COLORS[s] ?? '#E2E8F0') : '#E2E8F0',
          }}
        />
      ))}
    </div>
  );
}
