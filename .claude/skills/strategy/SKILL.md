---
name: strategy
description: Dor's personal fantasy strategy agent. Use when Dor asks about his own matchup (this week or next), whether he can still win, where his lineup is short, which free agent to add or who to drop, or to refresh the strategy page. Triggers on "/strategy", "my matchup", "who should I add", "should I give up this week".
---

# Strategy agent (Dor Barda, team 4)

Private to Dor — never add it to the website (`app/`), and never commit `strategy/out/`.

1. Run the engine on live ESPN data (needs `ESPN_S2`, `SWID`, `LEAGUE_ID`; run `npm ci` first if `node_modules` is missing):
   `npx tsx strategy/build.mts`
2. Read `strategy/out/report.json` and answer from it. Quote numbers exactly as they are there.
   - `current` / `next`: matchup per week — `final` = actual + projected, `winChance`, `verdict`, `notes`, day by day `sim.days` (`emptySlots` = open starting spots).
   - `pickups.today | tomorrow | restOfWeek | nextWeek`: free agents ranked by projected gain over the rest of that week, with the suggested drop. `stream: true` = he's worse than the drop long term.
   - `plan`: best use of today's + tomorrow's adds together (1 add per day) — quote this for "what should I do today".
   - `trending`: free agents heating up (last 7 days vs season, ESPN ownership change).
3. For a "what if" (a specific add/drop), use `rankPickups` / `simulateWeek` from `strategy/engine.ts` in a small tsx snippet rather than estimating by hand.
4. If asked to refresh the page: publish `strategy/out/strategy.html` with the Artifact tool to
   https://claude.ai/artifact/SUHQAdrHZqwLS1TP75Q3Bx (read it first when this conversation hasn't published it).

Dor prefers short, simple English, and exact numbers — if a number is an estimate (projection, win chance), say so; if unsure about a fact, offer to validate it.

League rule (confirmed by Dor): max 1 add per day. Win chance uses game-to-game spread ±46% (measured) and ±15% average error (assumed).
