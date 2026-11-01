---
name: sunday-recap
description: Sunday (last night of the matchup week) recap for the league WhatsApp group — a Hebrew message plus a short vertical MP4 video, built from live ESPN data. Use when the user asks for the "Sunday recap", "last night teaser", "סיכום יום ראשון", or a matchup recap video/message for the group.
---

# Sunday recap

Every Sunday (last day of the matchup week) the commissioner sends the group a
summary of all matchups, from the closest to the already decided, with a teaser
for the last night. This skill makes that message in Hebrew and a short video.

## 1. Get the numbers

```bash
npx tsx .claude/skills/sunday-recap/recap-data.mts --out recaps/recap.json
```

- Needs `ESPN_S2`, `SWID`, `LEAGUE_ID` (env or `.env.local`). `SEASON` defaults to 2027.
- Not Sunday and the user wants a test? Add `--as-if-last-night` (treats today
  as the last day: projection = live score + tonight only). Say clearly in the
  reply that it is a test on today's data.
- Uses the site's own projection and win-% code, so numbers match the matchups page.

Fields per team: `live`, `playersLeftTonight`, `keyPlayersTonight` (top 3 by
average, still to play tonight), `movesUsed` this week, `movesLeft` (league rule:
1 move per day of the matchup, so the limit = days in the week — usually 7),
`projected`, `winProb`. Per matchup: `gap`,
`leader`, `projectedWinner`, `favoriteWinProb`. Matchups come sorted closest first.

Story fields (the week so far vs. the frozen start-of-week projection in
`data/projections/<season>/week-NN.json`, plus `week-NN-daily.json`):

- per team `story`: `startProjected`, `startGames`, `startAvgPerGame`,
  `gamesPlayed` (starter-games), `gamesTotal` (+ tonight), `avgPerGame`,
  `volumeEffect` / `performanceEffect` (final projection − start projection,
  split into games and points per game), `missed` (start-of-week players who got
  fewer games than projected, with status — OUT/DTD = injury, DROPPED = cut),
  `pickups` + `pickupPoints` (players added this week), `bestVsAvg` / `worstVsAvg`.
- per matchup: `homeWinPath` (home win % at start + after each day),
  `leadPath` (home − away lead after each day, with each side's points and
  games that day), `underdogTonight` (points per player the underdog needs
  tonight if the favorite's players hit their averages; `expectedPerPlayer`
  for comparison). ESPN's projected average can be 0 for a player (no
  projection) — say so if it drags `expectedPerPlayer` down.

Players' week points are summed from one ESPN call per finished day; they should
add up to `live` for every team — check before writing the story.

## 2. Hebrew WhatsApp message

Write it yourself from the JSON — closest matchup first, decided ones last.
Per matchup, keep it short:

```
🔥 <team A> (<owner>) <live> – <live> <team B> (<owner>)
פער: <gap> לטובת <leader>
שחקנים שנשארו: <n> מול <n> | מהלכים שנשארו: <n> מול <n>
⭐ הלילה: <key players, both sides>
תחזית: <proj> – <proj> → <projected winner> (<win%>)
```

- Team and player names stay in English.
- Win %: never write 100% / 0% while players are left — use >99% / <1%.
- Round scores to whole numbers. Never invent or adjust a number; everything
  comes from the JSON. If a number looks wrong, ask the user before sending.
- Add a 1–2 line story per matchup: what turned it (more games, points per
  game above/below the projection, injuries, pickups/moves, a big day — use
  `leadPath` to find the swing day). For a matchup still open tonight, say what
  the underdog needs: points per player tonight vs. their expected per player.
- End with a one-line teaser for the closest matchup.

Write the same stories for the video in `recaps/stories.json`:
`{ "<homeTeamId>-<awayTeamId>": { "title": "…", "lines": ["…", …] } }` — up to
4 lines for open matchups, 5 for decided ones, ~45 characters each. Wrap English
names and signed numbers in `{…}` so they stay left-to-right; use `←` (not `→`)
inside Hebrew lines, and keep `a%–b%` style ranges out of Hebrew titles.

## 3. Video

```bash
node .claude/skills/sunday-recap/video/render.mjs recaps/recap.json recaps/week-NN.mp4 recaps/stories.json
```

- 1080×1920, 30 fps, H.264 — sends fine on WhatsApp. ~50 s with stories
  (~20–35 s without); a few minutes to render.
- Same order as the message: closest first, biggest blowouts last, then an outro
  on the closest matchup.
- Close matchup (underdog ≥ 10%, `CLOSE_MAX_FAV` in the template) → full card with
  every detail, then a story screen: daily-lead chart, story lines and
  "what the underdog needs tonight". Decided matchups → one story screen each
  (score, start → now win %, chart, lines). Without stories.json: compact
  screens, up to 3 per screen.
- Needs global Playwright + Chromium + ffmpeg (all present in the cloud container)
  and `npm ci` for the Heebo font.
- Look at 2–3 frames before sending (render one with the template's `render(t)`)
  when the template was changed.

Send the MP4 and the message to the user. `recaps/` is git-ignored.
