import type { HistoricalSeason } from './types';

export const LOGO_SLUGS = [
  'flint-tropics',
  'inglourious-basterds',
  'king-ozniyon',
  'leagues-american-problem',
  'libis-legacy',
  'nordau-peaky-blinder',
  'plottke',
  'slotzki',
  'team-mamba-forever',
  'team-miller',
] as const;

export function teamLogoPath(teamName: string): string | null {
  const slug = teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if ((LOGO_SLUGS as readonly string[]).includes(slug)) return `/teams/${slug}.png`;
  const teamWords = new Set(slug.split('-').filter(Boolean));
  let bestSlug: string | null = null;
  let bestScore = 0;
  for (const logoSlug of LOGO_SLUGS) {
    const score = logoSlug.split('-').filter(w => teamWords.has(w)).length;
    if (score > bestScore) { bestScore = score; bestSlug = logoSlug; }
  }
  return bestScore > 0 ? `/teams/${bestSlug}.png` : null;
}

export function ownerToSlug(ownerName: string): string {
  return ownerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function slugToOwner(slug: string, owners: string[]): string | null {
  return owners.find(o => ownerToSlug(o) === slug) ?? null;
}

/** Returns the logo path for an owner by scanning all their historical team names (newest first). */
export function bestLogoForOwner(ownerName: string, allSeasons: HistoricalSeason[]): string | null {
  // allSeasons sorted newest-first
  for (const season of allSeasons) {
    const team = season.finalStandings.find(t => t.ownerName === ownerName);
    if (team) {
      const logo = teamLogoPath(team.teamName);
      if (logo) return logo;
    }
  }
  return null;
}
