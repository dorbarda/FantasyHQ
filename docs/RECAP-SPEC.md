# Weekly Recap — specification

Defined with Dor on 2026-08-19. Build target: `/recap` and `/recap/[week]`,
plus a teaser card on the home page.

**Purpose:** a one-screen story of the week that people screenshot into the
group chat. Not another stats table — the Analysis page already does
season-wide leaderboards. The recap is about *this week's* drama.

---

## 1. Data sources

Everything comes from the nightly snapshots (`lib/snapshots.ts`); the recap
must not fan out live ESPN calls.

| Need | Source | Status |
| --- | --- | --- |
| Per-week scores, opponents, W/L | `matchup-depth` snapshot → `MatchupDepthRow` | ✅ available |
| Starter-games used per week | same, `totalPlayers` | ✅ available |
| Points per starter-game | same, `efficiency` | ✅ available |
| Week-by-week standings + movement | derived: accumulate `won` by `matchupPeriod` | ✅ derivable |
| Playoff weeks | `playoff-depth` snapshot, same shape | ✅ available |
| **Most-added player that week** | `transactions` snapshot | ⚠️ **needs the change in §4** |

**Not available:** historical projections. ESPN returns `projectedScore` for the
current week only, so any "beat their projection" award is impossible for past
weeks. Where a "should have won" notion is needed, use the week's league median
instead (see Robbed / Heist below).

`MatchupDepthRow` is one row **per team per week** (both sides of a matchup
appear), which makes per-team superlatives a simple scan and matchup-level ones
a pair-up by `matchupPeriod` + `opponentName`.

---

## 2. The awards

Names are playful per the agreed tone — in the spirit of the existing "Toilet
Bowl Hall of Shame". **These are first drafts; renaming is cheap, so push back
on any that don't sound like the league.**

### Core five

1. **Beatdown** — biggest margin of victory.
   `max(teamScore − opponentScore)` among winners.
2. **Heart Attack** — smallest margin.
   `min(teamScore − opponentScore)` among winners. Show both scores.
3. **Ceiling** — highest single-team score of the week.
4. **Robbed** — the unluckiest loss: the losing team whose score would have
   beaten the most *other* teams that week. Compute, for each loser, how many
   of the week's other team-scores it exceeds; take the max. Ties → higher
   score wins. This is the "I scored 120 and still lost" award.
5. **Heist** — the luckiest win: the winning team whose score would have lost
   to the most other teams that week. Mirror of Robbed.

### Effort awards

6. **The Grinder** — most starter-games used (`totalPlayers`). The streaming
   award: who actually worked the waiver wire and filled every slot.
7. **Sniper** — best `efficiency` (points per starter-game): most output per
   roster slot used. Deliberately the counterpoint to Grinder — one rewards
   volume, the other rewards precision.

### Waiver award

8. **Hot Pickup** — the most-added player across the league that week, with the
   add count and how many managers grabbed him. Needs §4.

### Optional (defer unless wanted)

- **Riser / Faller** — biggest standings movement vs. last week. Derivable, but
  it makes the page longer; hold until the core reads well.

### Tie-breaks and edge cases (apply to all)

- **Ties:** show all tied recipients rather than picking arbitrarily. Two
  managers tied on the biggest blowout is itself a good group-chat fact.
- **Week 1:** no previous standings, so movement awards are omitted, not zeroed.
- **In-progress weeks:** the recap renders only for weeks where every row has
  `won !== null`. `/recap` shows the latest *completed* week.
- **Ghost teams:** exclude automated/placeholder teams, matching the existing
  `isGhostTeam` filter (`/fake/i`) in `lib/espn-records.ts`.
- **Odd team count / byes:** a row with no opponent is skipped for matchup-level
  awards but still counts for team-level ones (Ceiling, Grinder, Sniper).
- **Empty week:** if no completed rows exist, the page shows a plain "no recap
  yet" state, never a half-filled card.

---

## 3. Code shape

```
lib/recap.ts          computeWeeklyRecap(rows, week, opts) → WeeklyRecap
                      listRecapWeeks(rows) → number[]   (completed, descending)
lib/__tests__/recap.test.ts
app/recap/page.tsx           latest completed week
app/recap/[week]/page.tsx    archive, generateStaticParams from listRecapWeeks
components/RecapCard.tsx     one award tile
components/RecapTeaser.tsx   compact home-page block
```

`computeWeeklyRecap` must be **pure** — it takes already-loaded rows and returns
a typed result, with no fetching inside. That is what made the playoff scoring
engine testable, and those tests caught a real crash bug.

**Tests are required**, mirroring `lib/__tests__/playoff-scoring.test.ts`:
each award with a hand-built fixture, every tie-break, week 1, an in-progress
week, a bye, and a golden test over the committed 2026 data so the numbers
can't drift silently.

---

## 4. Required pipeline change (Hot Pickup)

`getTransactions()` in `lib/espn.ts` already fetches transactions **per scoring
period** (`?view=mTransactions2&scoringPeriodId=${p}`, ~line 853) but discards
the period when tallying (~line 920), and `TransactionsData` has no per-week
field. So per-week adds are not in the snapshot today.

**Change:**
1. While walking each period's transactions, bucket ADD items by scoring period
   as well as in the existing season totals.
2. Map scoring period → matchup week. The depth builder already derives this
   exact mapping (`matchupScoringPeriods`, built from
   `pointsByScoringPeriod`); extract it into a shared helper rather than
   duplicating the logic. `tx.processDate` is a fallback if a period has no
   score data.
3. Add to `TransactionsData`:
   ```ts
   addsByWeek: { week: number; players: TransactionPlayer[] }[];
   ```
4. Update the `transactions` job's validator in `scripts/build-snapshots.mts`
   so an empty `addsByWeek` doesn't silently pass.

No extra ESPN requests — this only retains data already being fetched. Because
the snapshot script re-fetches every period on each run, **one nightly run
backfills all past weeks**; no migration needed.

Until that ships, build the recap with Hot Pickup behind a graceful absence
(the tile simply doesn't render), so the rest of the page is not blocked.

---

## 5. Page structure

**`/recap`** — latest completed week. **`/recap/[week]`** — archive, statically
generated for completed weeks, with prev/next navigation.

Layout, mobile-first, since it is built to be screenshotted on a phone:

1. **Header** — "Week N Recap", season label, and the week's headline fact
   (the biggest blowout or the closest game, whichever is more extreme).
2. **Award grid** — one tile per award: playful name, the manager (with
   `OwnerAvatar`), the number, and a one-line explanation of what earned it.
   Two-up on phones, four-up on desktop.
3. **All results** — every matchup that week, compact, winner emphasized.
4. **Footer** — prev/next week links.

**Design:** reuse the shipped system — tokens only (no hardcoded colours), the
`type-*` scale for headings, `OwnerAvatar` for people, and state-carrying
colour like the matchup cards. Must work in both themes and fit 390px wide.
A screenshot of the award grid alone should stand on its own without the header.

**Home teaser** — a compact card showing the week number and two or three
headline awards, linking to the full recap. Place it near the top of the home
page, above the matchup grid, so it is seen without hunting.

---

## 6. Build order

1. `lib/recap.ts` + tests for the seven awards that need no pipeline change.
2. `/recap` and `/recap/[week]` pages, Hot Pickup gracefully absent.
3. Home teaser card.
4. The §4 transactions change; Hot Pickup lights up after the next snapshot.
5. Optional Riser/Faller if the page still feels thin.

## 7. Open

- **Award names** — the list in §2 is a first draft; expect edits.
- **Riser / Faller** — include now or hold?
- Nothing else blocks starting.
