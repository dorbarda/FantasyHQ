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

Nightly Action moves from 09:00 UTC to **06:00 UTC = 08:00 Israel winter
time** (09:00 until clocks change on Oct 25, 2026).

A second run at 09:00 UTC stays as a catch-up: a late West Coast game can
still be in progress at 06:00 UTC, and that run fixes the numbers and
fetches clips uploaded late. If nothing changed it makes no commit.

## 5. Open / to verify

- Daily team totals are computed by us (sum of starters). Compare with ESPN
  on the first game night (~Oct 21) to confirm they match.
