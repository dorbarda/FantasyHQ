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
5. ~~Closest matchup~~ — replaced 2026-11-08 by the "Every matchup" card
   (§6).
6. **Highlights** — last night's clips, same cards as `/recap`.

Since 2026-11-08 these sit in three chapters — see §6.

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

Nightly Action runs twice a day, at **05:47 and 10:47 Israel time**, all
year (changed 2026-10-18; on 2026-10-21 the catch-up moved from 09:00 to
11:00, and both runs moved to :47 because GitHub starts on-the-hour runs
hours late). GitHub cron is UTC only, so both the winter
(03:47/08:47 UTC) and summer (02:47/07:47 UTC) times are scheduled and a
small first job skips the pair that doesn't match the day's Israel offset.

05:47 is so people wake up to the recap and clips. 10:47 is a catch-up: a
late West Coast game can still be on at 05:47, and that run fixes the
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
`lib/player-trends.ts` (tested). Refreshes with the 05:47/10:47 runs, not live.

## 6. Chapters, every-matchup card, NBA boxes (added 2026-11-08)

The page scrolls as three chapters, each with a big header and a
"Next ↓" link. A sticky menu (🏆 Fantasy · 🏀 NBA · 🎬 Highlights) glides
to each one and highlights the chapter on screen. Chapters fade in as they
scroll into view (CSS scroll-driven animation; off with reduced motion, and
browsers without it just show everything). No scroll locking — the fantasy
chapter is taller than a phone screen.

1. **Tonight in our fantasy league** — top 5, best/worst manager, the
   side column (§5), and **Every matchup** (`components/WeekPulseCard.tsx`):
   - score, **win chance** and **last night's swing** — from the
     day-by-day file `data/projections/<season>/week-NN-daily.json`, so it
     is the morning number and does not move during live games. Swing = the
     last day dot minus the dot before it; "now" also follows roster moves
     made after the night (`lib/week-pulse.ts`, tested).
   - **playing today** per team + its top 2 averages — live ESPN rosters
     through the projection lineup rules (IR out, OUT players don't start,
     games already started don't count) (`lib/tonight-data.ts`).
   - sorted by closest race (win chance nearest 50%); the biggest swing
     (≥ 10 points of %) gets a 🎢 badge.
2. **Tonight in the NBA** (`components/NbaNightCards.tsx`) — ESPN's public
   scoreboard, no key (`lib/nba-scoreboard.ts`, tested, cached 5 min):
   - **last night** = the nightly snapshot's date: final scores, records,
     each game's top scorer, ESPN's game note.
   - **next games** = first day with games after it (looks 4 days ahead),
     tip-off in **Israel time** (`Asia/Jerusalem`, so summer/winter time is
     automatic), and 👥 = players on our rosters in that game (IR not counted).
3. **Highlights** — unchanged clips.

Note: the live roster call is ~2.7 MB, over Next's 2 MB fetch cache, so it
is fetched fresh — at most once per 30-minute page revalidation.

## 7. NBA team logos (added 2026-11-08)

`public/nba/<key>.png` + `<key>-dark.png`, 96×96, downloaded once from
ESPN's CDN. `lib/nba-teams.ts` maps every spelling our sources use
(NYK/NY, GSW/GS, full names, nicknames) to a logo; `components/NbaLogo.tsx`
renders both and CSS shows the one for the current theme. Used across the
site wherever an NBA team appears.
