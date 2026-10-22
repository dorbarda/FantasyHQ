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
average, still to play tonight), `movesUsed` this week, `movesLeft` (null until
the weekly limit is confirmed), `projected`, `winProb`. Per matchup: `gap`,
`leader`, `projectedWinner`, `favoriteWinProb`. Matchups come sorted closest first.

## 2. Hebrew WhatsApp message

Write it yourself from the JSON — closest matchup first, decided ones last.
Per matchup, keep it short:

```
🔥 <team A> (<owner>) <live> – <live> <team B> (<owner>)
פער: <gap> לטובת <leader>
שחקנים שנשארו: <n> מול <n> | מהלכים שנוצלו: <n> מול <n>
⭐ הלילה: <key players, both sides>
תחזית: <proj> – <proj> → <projected winner> (<win%>)
```

- Team and player names stay in English.
- Win %: never write 100% / 0% while players are left — use >99% / <1%.
- Round scores to whole numbers. Never invent or adjust a number; everything
  comes from the JSON. If a number looks wrong, ask the user before sending.
- End with a one-line teaser for the closest matchup.

## 3. Video

```bash
node .claude/skills/sunday-recap/video/render.mjs recaps/recap.json recaps/week-NN.mp4
```

- 1080×1920, 30 fps, ~35 s, H.264 — sends fine on WhatsApp. About 1 minute to render.
- Order in the video is the reverse of the message: decided first, closest last
  (the cliffhanger), then an outro on the closest matchup.
- Needs global Playwright + Chromium + ffmpeg (all present in the cloud container)
  and `npm ci` for the Heebo font.
- Look at 2–3 frames before sending (render one with the template's `render(t)`)
  when the template was changed.

Send the MP4 and the message to the user. `recaps/` is git-ignored.
