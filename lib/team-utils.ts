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

// Common words that appear in many team names and shouldn't count as meaningful matches
const STOP_WORDS = new Set(['team', 'the', 'a', 'an', 'of', 'de', 'la', 'le']);

export function teamLogoPath(teamName: string): string | null {
  const slug = teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if ((LOGO_SLUGS as readonly string[]).includes(slug)) return `/teams/${slug}.png`;

  // Fuzzy match: overlap of *significant* words only (stop words excluded)
  const teamWords = new Set(slug.split('-').filter(w => w && !STOP_WORDS.has(w)));
  if (teamWords.size === 0) return null;

  let bestSlug: string | null = null;
  let bestScore = 0;
  for (const logoSlug of LOGO_SLUGS) {
    const score = logoSlug.split('-').filter(w => !STOP_WORDS.has(w) && teamWords.has(w)).length;
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

// Manual owner → logo overrides for owners whose current team name doesn't match their logo file
// (e.g. new teams or teams that changed name this season)
const OWNER_LOGO_OVERRIDES: Record<string, string> = {
  'Omer Rosenberg': 'inglourious-basterds',
  'Amir Ben Izhak': 'libis-legacy',
  'Nir Zele':       'slotzki',
  'Yuval Halevy':   'leagues-american-problem',
};

/** Returns the logo path for an owner by scanning all their historical team names (newest first). */
export function bestLogoForOwner(ownerName: string, allSeasons: HistoricalSeason[]): string | null {
  // Check manual override first
  const override = OWNER_LOGO_OVERRIDES[ownerName];
  if (override) return `/teams/${override}.png`;

  // Fall back to scanning historical team names (newest-first)
  for (const season of allSeasons) {
    const team = season.finalStandings.find(t => t.ownerName === ownerName);
    if (team) {
      const logo = teamLogoPath(team.teamName);
      if (logo) return logo;
    }
  }
  return null;
}
