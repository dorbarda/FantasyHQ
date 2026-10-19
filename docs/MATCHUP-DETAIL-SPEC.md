# Matchup detail — tap a card

Drafted 2026-10-19 (suggestion #7 from the Matchups page review).
Decisions by Dor, 2026-10-19:
- **Pop-up** over `/matchups` (not a separate page).
- **Our own projections** (player average × games).
- **No day-by-day table**: totals only.
- **Rosters**: only the 3 key players.
- **Watch list**: kept, as short notes.
- **Start-of-week numbers are frozen** in a file, so we can compare them with the final result later.

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
The 3 players with the most projected points this week (average × games).
IR players are left out. One row each:

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
| Average | 2025-26 fantasy points per game (10+ games). Otherwise (rookies, long injuries) ESPN's 2026-27 projected average. |
| Projected points | Σ player average × startable games. |

## 4. Frozen start-of-week numbers

- File per week: `data/projections/{season}/week-{NN}.json`.
- Written **once**, before the week's first game, and never changed after.
- Holds per team: games, games lost to the lineup limit, projected points,
  injuries, the 3 key players. `actual` is filled in when the week is final.
- The pop-up reads the frozen file for "projected" — so the number you see on
  Sunday is the same one that was there on Monday.
- Later: a season view "projection vs result" (how often the projected
  winner won, biggest surprises).

Week 1 (2026-27) was frozen by hand on 2026-10-19, the day before opening night.
From week 2 on, the nightly job should freeze each week on its first morning
(to build).

## 5. Build order

1. Games-per-team logic in `lib/` (suggestions #1–#2) + the freeze job.
2. Pop-up on `/matchups` reading the frozen file + live ESPN scores.
3. Fill `actual` when a week ends; later the season comparison view.
