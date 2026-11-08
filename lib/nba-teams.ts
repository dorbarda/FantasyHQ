/**
 * The 30 NBA teams and every way our data sources name them, so any of them
 * finds the logo. ESPN fantasy says "NYK"/"GSW", ESPN's scoreboard "NY"/"GS",
 * NBA.com "NYK"/"GSW", the playoff pool "New York Knicks".
 *
 * Logos live in public/nba/<key>.png (and <key>-dark.png for dark mode),
 * 96×96, downloaded once from ESPN's CDN.
 */

export interface NbaTeam {
  /** ESPN's logo slug — also the file name. */
  key: string;
  /** Main abbreviation, as NBA.com writes it. */
  abbrev: string;
  name: string;
  /** Other abbreviations seen in our sources. */
  aliases?: string[];
}

export const NBA_TEAMS: NbaTeam[] = [
  { key: 'atl', abbrev: 'ATL', name: 'Atlanta Hawks' },
  { key: 'bos', abbrev: 'BOS', name: 'Boston Celtics' },
  { key: 'bkn', abbrev: 'BKN', name: 'Brooklyn Nets', aliases: ['BRK', 'NJN'] },
  { key: 'cha', abbrev: 'CHA', name: 'Charlotte Hornets', aliases: ['CHO'] },
  { key: 'chi', abbrev: 'CHI', name: 'Chicago Bulls' },
  { key: 'cle', abbrev: 'CLE', name: 'Cleveland Cavaliers' },
  { key: 'dal', abbrev: 'DAL', name: 'Dallas Mavericks' },
  { key: 'den', abbrev: 'DEN', name: 'Denver Nuggets' },
  { key: 'det', abbrev: 'DET', name: 'Detroit Pistons' },
  { key: 'gs', abbrev: 'GSW', name: 'Golden State Warriors', aliases: ['GS'] },
  { key: 'hou', abbrev: 'HOU', name: 'Houston Rockets' },
  { key: 'ind', abbrev: 'IND', name: 'Indiana Pacers' },
  { key: 'lac', abbrev: 'LAC', name: 'LA Clippers', aliases: ['Los Angeles Clippers'] },
  { key: 'lal', abbrev: 'LAL', name: 'Los Angeles Lakers', aliases: ['LA Lakers'] },
  { key: 'mem', abbrev: 'MEM', name: 'Memphis Grizzlies' },
  { key: 'mia', abbrev: 'MIA', name: 'Miami Heat' },
  { key: 'mil', abbrev: 'MIL', name: 'Milwaukee Bucks' },
  { key: 'min', abbrev: 'MIN', name: 'Minnesota Timberwolves' },
  { key: 'no', abbrev: 'NOP', name: 'New Orleans Pelicans', aliases: ['NO', 'NOR'] },
  { key: 'ny', abbrev: 'NYK', name: 'New York Knicks', aliases: ['NY'] },
  { key: 'okc', abbrev: 'OKC', name: 'Oklahoma City Thunder' },
  { key: 'orl', abbrev: 'ORL', name: 'Orlando Magic' },
  { key: 'phi', abbrev: 'PHI', name: 'Philadelphia 76ers' },
  { key: 'phx', abbrev: 'PHX', name: 'Phoenix Suns', aliases: ['PHO'] },
  { key: 'por', abbrev: 'POR', name: 'Portland Trail Blazers' },
  { key: 'sac', abbrev: 'SAC', name: 'Sacramento Kings' },
  { key: 'sa', abbrev: 'SAS', name: 'San Antonio Spurs', aliases: ['SA'] },
  { key: 'tor', abbrev: 'TOR', name: 'Toronto Raptors' },
  { key: 'utah', abbrev: 'UTA', name: 'Utah Jazz', aliases: ['UTAH', 'UTH'] },
  { key: 'wsh', abbrev: 'WAS', name: 'Washington Wizards', aliases: ['WSH'] },
];

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

const LOOKUP = new Map<string, NbaTeam>();
for (const t of NBA_TEAMS) {
  const nickname = t.name.split(' ').slice(t.name.startsWith('Portland') ? -2 : -1).join(' ');
  for (const k of [t.key, t.abbrev, t.name, nickname, ...(t.aliases ?? [])]) LOOKUP.set(norm(k), t);
}

/** Any abbreviation, full name or nickname → the team. Null for FA, "—", unknown. */
export function findNbaTeam(input: string | null | undefined): NbaTeam | null {
  if (!input) return null;
  return LOOKUP.get(norm(input)) ?? null;
}

export function nbaLogoSrc(input: string | null | undefined, dark = false): string | null {
  const t = findNbaTeam(input);
  return t ? `/nba/${t.key}${dark ? '-dark' : ''}.png` : null;
}
