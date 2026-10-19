# Matchup detail — tap a card

Drafted 2026-10-19 (suggestion #7 from the Matchups page review).
**Status: draft — waiting for Dor's OK.**

**Purpose:** answer "who has the edge this week, and why?" in one screen.
Open it from any card on `/matchups`.

---

## 1. How it opens

- Tap a matchup card → new page `/matchups/{week}/{homeTeamId}-{awayTeamId}`
  (works on phone, can be shared in WhatsApp).
- "← All matchups" link back to the same week.
- Your own team is always on the **left** when you open your matchup
  (otherwise ESPN's home team is left).

## 2. Sections (top to bottom)

### 2.1 Header
Logos, team names, owners, records — same as the card, bigger.
Score row changes with the week's state:

| State | Score shows |
| --- | --- |
| Not started | Projected points |
| Live | Actual points (big) + projected (small) |
| Final | Actual points, winner in bold |

Under it: **all-time H2H** between the two owners (all seasons, regular season
+ playoffs shown separately), format: `All-time W–L · Playoffs W–L`.

### 2.2 Edge strip (the key numbers)
Four small tiles, each shows left vs right and who leads:

| Tile | Meaning |
| --- | --- |
| **Games** | Startable player-games this week (IR out, 10-spot limit applied) |
| **Games left** | Same, from today to the end of the week (live weeks only) |
| **Projected** | Projected points for the week |
| **Injuries** | Players OUT / day-to-day |

### 2.3 Day by day
One row per day of the matchup week. Each side shows games that day;
a red mark when a team has more than 10 players playing (games lost to the
lineup limit). Today is highlighted; past days show points instead of games.

Example — week 1, your real matchup (counted 2026-10-19):

```
              Nordau   Miller
Tue Oct 20       1        3
Wed Oct 21      10        8
Thu Oct 22       2        3
Fri Oct 23       9        9
Sat Oct 24       7        6
Sun Oct 25       5        6
─────────────────────────────
Total           34       35     → Miller +1
```

### 2.4 Rosters side by side
Two columns (on phone: tabs "Nordau | Miller"). Grouped Starters → Bench → IR.

Each player row (layout example, not real data):
```
Player     PG · OKC   ● ○ ● ○ ● ○   3 g   avg xx.x   ACTIVE
```
- Position, NBA team
- One dot per day: ● plays, ○ no game, ✕ game but lost to lineup limit
- Games this week
- Average fantasy points (this season; last season until he has 3 games)
- Status badge: OUT (red), DAY_TO_DAY (yellow), nothing when active
- Live/final weeks: points this week instead of the average

### 2.5 Watch list
Short auto notes, max 3, for example:
- "Curry, Hart, Wallace are day-to-day — Miller could drop to 32 games."
- "Wednesday: Nordau has 10 players playing — full lineup, nothing lost."

## 3. Definitions

| Term | Meaning |
| --- | --- |
| Week | ESPN matchup period, Monday–Sunday (week 1 = Tue Oct 20 – Sun Oct 25, 6 days). |
| Startable game | Player not on IR, team has a game that day, and he fits a starting spot (PG, SG, SF, PF, C, G, F, 3× UTIL = 10). |
| Projected points | Σ player average × startable games. |
| Games left | Startable games from today (games not started yet) to week end. |

## 4. Data

- Rosters, injury status, eligible positions: ESPN `mRoster` (live).
- NBA schedule: `data/snapshots/schedule.json` (nightly).
- Averages: ESPN player stats (season split).
- All-time H2H: `data/snapshots/history.json` + current season.
- Reuses the "games per team" logic from suggestions #1–#2 — build those first.

## 5. Open questions for Dor

1. New page (shareable link) or a pop-up over the matchups page?
2. Projected points: our own (average × games) or ESPN's projection?
3. Show the watch list notes, or keep it numbers only?
