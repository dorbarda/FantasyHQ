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

## 3. Video

```bash
node .claude/skills/sunday-recap/video/render.mjs recaps/recap.json recaps/week-NN.mp4
```

- 1080×1920, 30 fps, ~20–35 s, H.264 — sends fine on WhatsApp. About 1 minute to render.
- Music: by default an original beat made in code (`music.mjs`, no licence issue) —
  drums drop with the first card and fade out over the outro. To use the user's
  own track: `--music path/to/song.mp3` (cut to length, faded in/out). Silent: `--no-music`.
  Never download copyrighted music; only use a file the user provides.
- Same order as the message: closest first, biggest blowouts last, then an outro
  on the closest matchup.
- Close matchup (underdog ≥ 20%, `CLOSE_MAX_FAV` in the template) → full card with
  every detail. The rest → compact screens, up to 3 per screen: score, gap, win %.
- Needs global Playwright + Chromium + ffmpeg (all present in the cloud container)
  and `npm ci` for the Heebo font.
- Look at 2–3 frames before sending (render one with the template's `render(t)`)
  when the template was changed.

Send the MP4 and the message to the user. `recaps/` is git-ignored.
