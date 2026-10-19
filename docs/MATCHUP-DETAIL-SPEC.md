# Matchup detail — tap a card

Drafted 2026-10-19 (suggestion #7 from the Matchups page review).
Decisions by Dor, 2026-10-19:
- **Pop-up** over `/matchups` (not a separate page).
- **Our own projections** (player average × games).
- **No day-by-day table**: totals only.
- **Rosters**: only the 3 key players = the 3 highest averages (e.g. facing Jokic, it matters a lot whether he has 2 or 4 games).
- **Watch list**: kept, as short notes.
- **Start-of-week numbers are frozen** in a file, so we can compare them with the final result later — and see what each manager did during the week (roster moves) to win.
- **Averages**: weeks 1–4 ESPN's season projection; from week 5 the last 30 days.
- **Freeze time**: every Sunday evening, ready for Monday's new matchup.

---

## 1. How it opens

- Tap a matchup card → pop-up over the matchups page. Close with ✕, tap outside, or Esc.
- Phone: full-screen sheet from the bottom. Desktop: centered box (max ~560px).
- Your own team on the left when it's your matchup (otherwise ESPN's home team).

## 2. Sections (top to bottom)

### 2.1 Header
Logos, team names, owners, records. Score row:

| State | Score shows |
| --- | --- |
| Not started | Our projected points |
| Live | Actual points (big) + start-of-week projection (small) |
| Final | Actual points, winner in bold, + "Projected at start: X – Y" |

Under it: all-time H2H between the two owners, format `All-time W–L · Playoffs W–L`.

### 2.2 Key numbers (totals only)
Four tiles, left vs right, leader highlighted:

| Tile | Meaning |
| --- | --- |
| **Games** | Startable player-games this week |
| **Games left** | Same, from today to week end (live weeks only) |
| **Projected** | Our projected points for the week |
| **Injuries** | Players OUT / day-to-day |

### 2.3 Key players (3 per team)
The 3 players with the highest average (IR left out), and how many games
each one has this week. One row each:

```
Name            POS · NBA   games   avg   projected
```
Live/final weeks: add points scored so far.

### 2.4 Watch list (notes)
Up to 3 short notes, built from the numbers above. Examples of the kinds of notes:
- Day-to-day players and how many games they could cost.
- Games lost to the 10-player lineup limit.
- A big games gap ("+4 games for Mamba").

## 3. Definitions

| Term | Meaning |
| --- | --- |
| Week | ESPN matchup period, Monday–Sunday (week 1 = Tue Oct 20 – Sun Oct 25, 6 days). |
| Startable game | Player not on IR, his NBA team plays that day, and he fits one of the 10 starting spots (PG, SG, SF, PF, C, G, F, 3× UTIL). If more than 10 can play, the highest averages start. |
| Average | Weeks 1–4: ESPN's projected fantasy points per game for the season. Week 5 on: actual average over the last 30 days (ESPN projection if the player has no games in that window). |
| Projected points | Σ player average × startable games. |

## 4. Frozen start-of-week numbers

- File per week: `data/projections/{season}/week-{NN}.json`.
- Written **once**, before the week's first game, and never changed after.
- Holds per team: games, games lost to the lineup limit, projected points,
  injuries, the 3 key players, and the whole roster with each player's games
  (to compare with roster moves later). `actual` is filled in when the week is final.
- The pop-up reads the frozen file for "projected" — so the number you see on
  Sunday is the same one that was there on Monday.
- Later: a season view "projection vs result" (how often the projected
  winner won, biggest surprises).

Built: `lib/week-projections.ts` (logic + tests), `scripts/freeze-week-projections.mts`,
Action `week-projections.yml` — Sundays 17:00 UTC (19:00/20:00 Israel) + 20:00 UTC
catch-up. Picks the next week that hasn't started; never overwrites.
Week 1 (2026-27) was frozen on 2026-10-19, the day before opening night.

## 5. Build order

1. ~~Projection logic + Sunday freeze job.~~ Done. Reuse it for suggestions #1–#2.
2. Pop-up on `/matchups` reading the frozen file + live ESPN scores.
3. Fill `actual` when a week ends; later the season comparison view.
