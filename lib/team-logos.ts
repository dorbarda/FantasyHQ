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

export function teamLogoSrc(teamName: string): string | null {
  const slug = TEAM_LOGO_MAP[teamName];
  return slug ? `/teams/${slug}.png` : null;
}
