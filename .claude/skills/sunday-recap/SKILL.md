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
- "Tonight" = the next night with games left. Israel Sunday morning ESPN is still
  on Saturday; the script then uses Sunday (field `tonight`).
- Not Sunday and the user wants a test? Add `--as-if-last-night` (treats today
  as the last day: projection = live score + tonight only). Say clearly in the
  reply that it is a test on today's data.
- Uses the site's own projection and win-% code, so numbers match the matchups page.

Fields per team: `live`, `playersLeftTonight`, `keyPlayersTonight` (top 3 by
average, still to play tonight), `movesUsed` this week, `movesLeft` (league rule:
1 move per game day of the matchup, so the limit = days with NBA games — usually 7;
week 3 of 2026-27 had 6, no games on Election Day),
`projected`, `winProb`. Per matchup: `gap`, `whatIf` (each DTD player: win % if he plays / sits),
`leader`, `projectedWinner`, `favoriteWinProb`. Matchups come sorted closest first.

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
- End with a one-line teaser for the closest matchup.

## 3. Video — "Sunday Showdown"

```bash
node .claude/skills/sunday-recap/video/render.mjs recaps/recap.json recaps/week-NN.mp4
```

- 1080×1920, 30 fps, ~45–55 s, H.264 + AAC, ~12 MB — sends fine on WhatsApp. About 4 minutes to render.
- Broadcast style, cut on the beat (120 BPM, scenes measured in beats):
  intro → THE BOARD (all scores + win %) → a fight card per close matchup
  (underdog ≥ 10%, `CLOSE_MAX_FAV`) → WHAT IF? for a DTD player who swings his
  matchup ≥ 15% (`BIG_SWING`) → DTD WATCH (every doubtful player: win % if he
  plays → if he sits) → QUICK HITS (decided ones) → match of the night.
- What-ifs come from the JSON (`whatIf` per matchup: the player ruled OUT, a
  bench player may take his spot). Never write them by hand.
- Music: `video/music.py` synthesizes an original track (numpy only, no rights
  issues) on the same beat grid, with a riser + impact on every cut
  (`window.CUES`). render.mjs runs it and muxes it in.
- Needs global Playwright + Chromium + ffmpeg + python3/numpy (all present in the
  cloud container) and `npm ci` for the Heebo font.
- Look at 3–4 frames before sending (render one with the template's `render(t)`)
  when the template was changed.

Send the MP4 and the message to the user. `recaps/` is git-ignored.
