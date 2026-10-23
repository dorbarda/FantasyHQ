import { describe, it, expect } from 'vitest';
import {
  normalize,
  isFullGameHighlights,
  dateFromTitle,
  matchupFromTitle,
  nbaDayOf,
  findPlayerVideo,
  findGameVideo,
  findNightlyRecap,
  isPlayableHere,
  pickClips,
  toHighlight,
  decodeEntities,
  type YoutubeVideo,
  type Performer,
} from '../youtube';

// Real title format from the NBA channel.
const GAME: YoutubeVideo = {
  id: 'g1',
  title: '#7 TRAIL BLAZERS at #2 SPURS | FULL GAME 5 HIGHLIGHTS | April 28, 2026',
  publishedAt: '2026-04-29T04:10:00Z',
};
const WEMBY: YoutubeVideo = {
  id: 'p1',
  title: 'Victor Wembanyama GOES OFF for 40 PTS & 15 REB 🔥',
  publishedAt: '2026-04-29T03:30:00Z',
};
const OTHER: YoutubeVideo = {
  id: 'x1',
  title: 'Kevin Durant on his 20th NBA Media Day',
  publishedAt: '2026-04-29T02:00:00Z',
};

// Spurs–Blazers tip-off, before WEMBY and GAME were posted.
const TIPOFF = Date.parse('2026-04-29T00:30:00Z');

const perf = (over: Partial<Performer>): Performer => ({
  date: '2026-04-28', playerName: 'Victor Wembanyama', proTeam: 'SAS', fantasyPoints: 70, ownerName: 'Dor Barda',
  tipoffMs: TIPOFF, ...over,
});

describe('title parsing', () => {
  it('recognises full-game highlights, including playoff "GAME 5"', () => {
    expect(isFullGameHighlights(GAME.title)).toBe(true);
    expect(isFullGameHighlights('LAKERS at WARRIORS | FULL GAME HIGHLIGHTS | December 25, 2025')).toBe(true);
    expect(isFullGameHighlights(WEMBY.title)).toBe(false);
  });

  it('reads the game date and matchup off the title', () => {
    expect(dateFromTitle(GAME.title)).toBe('2026-04-28');
    expect(dateFromTitle(WEMBY.title)).toBeNull();
    expect(matchupFromTitle(GAME.title)).toBe('TRAIL BLAZERS at SPURS');
  });

  it('puts a clip posted after midnight UTC on the previous US game night', () => {
    expect(nbaDayOf('2026-04-29T04:10:00Z')).toBe('2026-04-28');
    expect(nbaDayOf('2026-04-29T12:00:00Z')).toBe('2026-04-29');
  });

  it('normalises accents and case so ESPN and YouTube names meet', () => {
    expect(normalize('Nikola JOKIĆ')).toBe('nikola jokic');
  });
});

describe('finding videos', () => {
  const videos = [OTHER, WEMBY, GAME];

  it("finds the player's own clip by full name", () => {
    expect(findPlayerVideo(videos, 'Victor Wembanyama', '2026-04-28', TIPOFF)?.id).toBe('p1');
  });

  it('ignores accents and a Jr. suffix in the name', () => {
    const v = { id: 'p2', title: 'Nikola Jokić triple-double!', publishedAt: '2026-04-29T03:00:00Z' };
    expect(findPlayerVideo([v], 'Nikola Jokic', '2026-04-28', TIPOFF)?.id).toBe('p2');
    const j = { id: 'p3', title: 'Jaren Jackson blocks everything', publishedAt: '2026-04-29T03:00:00Z' };
    expect(findPlayerVideo([j], 'Jaren Jackson Jr.', '2026-04-28', TIPOFF)?.id).toBe('p3');
  });

  it('does not match a clip from another night', () => {
    expect(findPlayerVideo(videos, 'Victor Wembanyama', '2026-04-20', TIPOFF)).toBeNull();
  });

  it('skips a clip posted before tip-off (camp tours, off-court bits)', () => {
    const v = { id: 'p5', title: 'Victor Wembanyama takes us inside training camp', publishedAt: '2026-04-28T18:00:00Z' };
    expect(findPlayerVideo([v], 'Victor Wembanyama', '2026-04-28', TIPOFF)).toBeNull();
  });

  it('takes no player clip when the tip-off is unknown', () => {
    expect(findPlayerVideo(videos, 'Victor Wembanyama', '2026-04-28', null)).toBeNull();
  });

  it('does not match on part of a name', () => {
    const v = { id: 'p4', title: 'Amen Thompson on defense', publishedAt: '2026-04-29T03:00:00Z' };
    expect(findPlayerVideo([v], 'Ausar Thompson', '2026-04-28', TIPOFF)).toBeNull();
  });

  it("finds the full game of the player's team that night", () => {
    expect(findGameVideo(videos, 'SAS', '2026-04-28')?.id).toBe('g1');
    expect(findGameVideo(videos, 'POR', '2026-04-28')?.id).toBe('g1');
    expect(findGameVideo(videos, 'LAL', '2026-04-28')).toBeNull();
  });
});

describe('findNightlyRecap', () => {
  const recap = (day: number) => ({ id: `r${day}`, title: `NBA's Nightly Recap | October ${day}, 2026`, publishedAt: '2026-10-23T06:40:00Z' });
  it("finds the recap by the date in its title", () => {
    expect(findNightlyRecap([OTHER, recap(21), recap(22)], '2026-10-22')?.id).toBe('r22');
  });
  it('returns null when that night has no recap yet', () => {
    expect(findNightlyRecap([recap(21)], '2026-10-22')).toBeNull();
  });
});

describe('pickClips', () => {
  it("prefers the player's own clip, falls back to his game", () => {
    const clips = pickClips(
      [perf({}), perf({ playerName: 'Deni Avdija', proTeam: 'POR', fantasyPoints: 50 })],
      [WEMBY, GAME]
    );
    expect(clips.map(c => [c.performer.playerName, c.video.id, c.kind])).toEqual([
      ['Victor Wembanyama', 'p1', 'player'],
      ['Deni Avdija', 'g1', 'game'],
    ]);
  });

  it('uses the full game when the only player clip came before tip-off', () => {
    const early = { ...WEMBY, publishedAt: '2026-04-28T18:00:00Z' };
    const clips = pickClips([perf({})], [early, GAME]);
    expect(clips.map(c => [c.video.id, c.kind])).toEqual([['g1', 'game']]);
  });

  it('does not repeat a game video for two players from the same game', () => {
    const clips = pickClips(
      [perf({ playerName: 'Stephon Castle', fantasyPoints: 60 }), perf({ playerName: 'Deni Avdija', proTeam: 'POR', fantasyPoints: 50 })],
      [GAME]
    );
    expect(clips).toHaveLength(1);
    expect(clips[0].performer.playerName).toBe('Stephon Castle');
  });

  it('carries player, owner and points into the stored highlight', () => {
    const [clip] = pickClips([perf({})], [WEMBY]);
    expect(toHighlight(clip)).toMatchObject({
      id: 'p1', player: 'Victor Wembanyama', ownerName: 'Dor Barda', fantasyPoints: 70,
      embedUrl: 'https://www.youtube-nocookie.com/embed/p1',
    });
  });
});

describe('isPlayableHere', () => {
  const ok = { status: { embeddable: true, privacyStatus: 'public' }, contentDetails: {} };
  it('accepts a public, embeddable, unrestricted video', () => {
    expect(isPlayableHere(ok)).toBe(true);
  });
  it('rejects embedding disabled, private, or blocked in Israel', () => {
    expect(isPlayableHere({ ...ok, status: { embeddable: false, privacyStatus: 'public' } })).toBe(false);
    expect(isPlayableHere({ ...ok, status: { embeddable: true, privacyStatus: 'unlisted' } })).toBe(false);
    expect(isPlayableHere({ ...ok, contentDetails: { regionRestriction: { blocked: ['IL'] } } })).toBe(false);
    expect(isPlayableHere({ ...ok, contentDetails: { regionRestriction: { allowed: ['US'] } } })).toBe(false);
  });
});

describe('decodeEntities', () => {
  it('unescapes search titles so name matching still works', () => {
    expect(decodeEntities('Jokić &amp; Murray | &quot;clutch&quot; &#39;26')).toBe('Jokić & Murray | "clutch" \'26');
  });
});
