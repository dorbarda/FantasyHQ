import { existsSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { NBA_TEAMS, findNbaTeam, nbaLogoSrc } from '../nba-teams';
import { PRO_TEAM_ABBREV } from '../espn-schedule';

describe('findNbaTeam', () => {
  it('has 30 teams with unique keys', () => {
    expect(NBA_TEAMS).toHaveLength(30);
    expect(new Set(NBA_TEAMS.map(t => t.key)).size).toBe(30);
  });

  it('reads every source spelling', () => {
    for (const s of ['NYK', 'NY', 'ny', 'New York Knicks', 'Knicks']) expect(findNbaTeam(s)?.key).toBe('ny');
    for (const s of ['GSW', 'GS', 'Warriors']) expect(findNbaTeam(s)?.key).toBe('gs');
    for (const s of ['SAS', 'SA']) expect(findNbaTeam(s)?.key).toBe('sa');
    for (const s of ['UTA', 'UTAH']) expect(findNbaTeam(s)?.key).toBe('utah');
    for (const s of ['WAS', 'WSH']) expect(findNbaTeam(s)?.key).toBe('wsh');
    expect(findNbaTeam('Trail Blazers')?.key).toBe('por');
    expect(findNbaTeam('76ers')?.key).toBe('phi');
  });

  it('knows every fantasy pro team abbreviation', () => {
    for (const a of Object.values(PRO_TEAM_ABBREV)) expect(findNbaTeam(a), a).not.toBeNull();
  });

  it('is null for free agents and blanks', () => {
    expect(findNbaTeam('FA')).toBeNull();
    expect(findNbaTeam('—')).toBeNull();
    expect(findNbaTeam('')).toBeNull();
    expect(findNbaTeam(undefined)).toBeNull();
  });
});

describe('logo files', () => {
  it('every team has a light and a dark logo', () => {
    for (const t of NBA_TEAMS) {
      for (const dark of [false, true]) {
        const src = nbaLogoSrc(t.abbrev, dark)!;
        expect(existsSync(path.join(process.cwd(), 'public', src)), src).toBe(true);
      }
    }
  });
});
