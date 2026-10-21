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

Nightly Action runs twice a day, at **06:00 and 11:00 Israel time**, all
year (changed 2026-10-18; catch-up moved from 09:00 to 11:00 on 2026-10-21). GitHub cron is UTC only, so both the winter
(04:00/09:00 UTC) and summer (03:00/08:00 UTC) times are scheduled and a
small first job skips the pair that doesn't match the day's Israel offset.

06:00 is so people wake up to the recap and clips. 11:00 is a catch-up: a
late West Coast game can still be on at 06:00, and that run fixes the
numbers and fetches clips uploaded late. If nothing changed it makes no commit.

## 5. Open / to verify

- ~~Daily team totals are computed by us (sum of starters).~~ Verified
  2026-10-06 against ESPN's own `pointsByScoringPeriod`: 40 team-days from
  2025-26, 0 mismatches.

## 5. Side column — player trends (added 2026-10-19)

Three cards to the right of the recap (below it on narrow screens).

| Card | Definition |
| --- | --- |
| Top 5 · last 30 days | ESPN's last-30-days fantasy points (stat row `03YYYY`). Until day 30 of the season this equals the season total. |
| Surprises & busts | Gain = preseason projected rank − current rank, both by **total points** among all NBA players. Surprises: biggest gain, current top 100 only. Busts: biggest drop, projected top 100 only (injured players count — zero points is a bust). Equal points share a rank. |
| Power rankings · top 3 | Same as Analysis (points per player started, last 3 completed weeks). |

The preseason projection is frozen once into
`data/projections/<season>/preseason-ranks.json` on the first nightly run
(ESPN keeps updating its projection in-season). Data: new nightly snapshot
`player-trends`, built by `lib/player-trends-data.ts`; logic in
`lib/player-trends.ts` (tested). Refreshes with the 06:00/11:00 runs, not live.
