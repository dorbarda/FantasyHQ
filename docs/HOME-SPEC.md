# Home page — daily recap

Defined with Dor on 2026-10-06. Replaces the old home page completely
(score strip, closest-game hero, week score cards, standings, playoff
preview, quick links and recap teaser are all gone).

**Purpose:** "what happened last night" — the page people open every
morning. The weekly story stays on `/recap`.

---

## 1. Sections (top to bottom)

1. **Header** — logo, "Last night · Mon, Oct 20", season.
2. **Top 5 players of the night** — fantasy points, NBA team, which manager
   owns him. Only players in a starting slot count (bench and IR don't score
   for anyone).
3. **Manager of the night** — highest total points that night.
4. **Worst manager of the night** — lowest **points per player who played**
   (option b). Managers with nobody playing are left out.
5. **Closest matchup** — the current week's closest head-to-head (live ESPN,
   same card as before).
6. **Highlights** — last night's clips, same cards as `/recap`.

## 2. Definitions

| Term | Meaning |
| --- | --- |
| Night | One NBA game day (US date), i.e. one ESPN daily scoring period. |
| Last night | The most recent finished day **with games**. On a night with no games (before opening night, All-Star break) we show the last night that had games, with its date. Look-back: 10 days. |
| Player played | Starter with minutes > 0 or fantasy points ≠ 0 that day. |
| Manager points | Sum of that day's fantasy points of all his starters. |
| Points per player | Manager points ÷ players played. |

**Tie-breaks**
- Manager of the night: equal points → higher points per player.
- Worst manager: equal points per player → lower total points.
- Top 5: equal points → alphabetical.

## 3. Data

New nightly snapshot `data/snapshots/nightly.json`, built by
`lib/nightly-data.ts` from one ESPN roster call per day
(`?view=mRoster&view=mTeam&scoringPeriodId=N`) — the same call the depth
pages and highlights use. It stores every team's points and players played,
plus the night's top 10 players. Awards are computed at render
(`lib/nightly.ts`, pure, tested).

A night with no games is not written, so the file keeps the last game night.

## 4. Schedule

Nightly Action runs twice a day, at **06:00 and 09:00 Israel time**, all
year (changed 2026-10-18). GitHub cron is UTC only, so both the winter
(04:00/07:00 UTC) and summer (03:00/06:00 UTC) times are scheduled and a
small first job skips the pair that doesn't match the day's Israel offset.

06:00 is so people wake up to the recap and clips. 09:00 is a catch-up: a
late West Coast game can still be on at 06:00, and that run fixes the
numbers and fetches clips uploaded late. If nothing changed it makes no commit.

## 5. Open / to verify

- ~~Daily team totals are computed by us (sum of starters).~~ Verified
  2026-10-06 against ESPN's own `pointsByScoringPeriod`: 40 team-days from
  2025-26, 0 mismatches.
