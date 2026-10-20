# Strategy agent (private)

Dor's personal matchup + free-agent advisor. **Not part of the website** —
nothing in `app/` imports this folder, and its output (`strategy/out/`) is
git-ignored. The page is a private claude.ai artifact:
https://claude.ai/artifact/SUHQAdrHZqwLS1TP75Q3Bx — rebuilt every morning by a
scheduled Claude task, and on demand with the `/strategy` skill.

```bash
npx tsx strategy/build.mts      # needs ESPN_S2, SWID, LEAGUE_ID (SEASON optional)
npx vitest run strategy         # engine tests
```

| File | What |
| --- | --- |
| `engine.ts` | Pure math: per-game average, opponent defense, day-by-day lineup, win chance, free-agent gain |
| `build.mts` | Fetches ESPN (league, rosters, top-800 player pool, NBA schedule) and writes `out/report.json` + `out/strategy.html` |
| `render.ts` | The HTML page |

How it decides, in short:
- **Average used**: ESPN projection before games, moving to real form (60% last 15 days + 40% season) by game 10.
- **Projection**: same lineup rules as the site's week projections (10 spots, best averages start, IR/OUT get no games), times an opponent-defense factor (±15% max, from the last 21 days of game logs).
- **Win chance**: normal approximation; game-to-game spread 46% (measured on 2025-26 logs), 15% average error (assumed).
- **Free agents**: gain = my projected points with him in and the best drop out, over the rest of the week. Drops are only my 2 weakest players or anyone he's better than.
- **Verdict**: ≥65% favored, 40–65% toss-up, 15–40% underdog, <15% long shot (adds go to next week).
