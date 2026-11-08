import { findNbaTeam } from '@/lib/nba-teams';

/**
 * Small NBA team logo. Takes any abbreviation or name our sources use; renders
 * nothing for free agents or unknown teams. Both versions are in the page and
 * CSS shows the one matching the theme (.nba-logo-light / .nba-logo-dark in
 * globals.css), so the toggle needs no JavaScript.
 */
export default function NbaLogo({
  team,
  size = 16,
  className = '',
}: {
  team: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const t = findNbaTeam(team);
  if (!t) return null;
  const common = {
    width: size,
    height: size,
    title: t.name,
    loading: 'lazy' as const,
    decoding: 'async' as const,
    style: { width: size, height: size },
  };
  return (
    <span className={`inline-flex shrink-0 align-middle ${className}`} aria-label={t.name} role="img">
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static files, no optimisation needed */}
      <img src={`/nba/${t.key}.png`} alt="" className="nba-logo-light object-contain" {...common} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/nba/${t.key}-dark.png`} alt="" className="nba-logo-dark object-contain" {...common} />
    </span>
  );
}
