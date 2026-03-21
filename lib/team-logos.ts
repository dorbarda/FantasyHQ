// Maps ESPN team names to their avatar image filenames in /public/teams/
const TEAM_LOGO_MAP: Record<string, string> = {
  'Slotzki':                    'slotzki',
  'PlottKe':                    'plottke',
  'Team Miller':                'team-miller',
  'King Ozniyon':               'king-ozniyon',
  'Inglourious Basterds':       'inglourious-basterds',
  "Libi's Legacy":              'libis-legacy',
  'Team Mamba Forever':         'team-mamba-forever',
  "League's American Problem":  'leagues-american-problem',
  'Flint Tropics 70\'s Show':   'flint-tropics',
  'Nordau Peaky Blinder':       'nordau-peaky-blinder',
};

// Strip emojis and trim so ESPN team names with appended emoji still match
function normalize(name: string): string {
  // Surrogate pairs cover emojis in \u{10000}-\u{1FFFF}; also strip common symbol ranges
  return name.replace(/[\uD800-\uDFFF]|[\u2600-\u27FF]|[\uFE00-\uFE0F]/g, '').trim();
}

export function teamLogoSrc(teamName: string): string | null {
  const slug = TEAM_LOGO_MAP[teamName] ?? TEAM_LOGO_MAP[normalize(teamName)];
  return slug ? `/teams/${slug}.png` : null;
}
