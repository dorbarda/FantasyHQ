# Next session — pick up here

Written 2026-08-19 at the end of the design pass. This file is self-contained:
a fresh chat with no history should be able to read it and continue.

---

## 0. Where things stand (updated 2026-09-23)

Everything from the design pass, recap, schedule grid and season switch is
**merged to `main` and live**. `SEASON=2027` is set on Vercel and in the
Action, and the ESPN league for 2026-27 answers (week 1 matchups load).

### 2026-27 readiness check (2026-09-23)

Fixed on `claude/friendly-dirac-jlin7m`:
- Last season's weeks showed as "2026-27" (recap, home teaser, analysis,
  depth, transactions). Snapshots now carry a `season` tag and
  single-season ones from another season are ignored.
- History listed an unplayed 2026-27 with a fake champion; Records showed
  "Worst Season Record 0–0 2026-27" and counted 2026-27 as a season played.
  The current season now joins history only once its final is decided, and
  a season with no games is left out of records.
- Nightly Action committed every day even when only the timestamp changed
  (one needless Vercel redeploy per day). Unchanged snapshots are now skipped.
- Standings said "Live · Week 17" before opening night → "Pre-season".
- Draft page picked its default year by calendar year, so after the October
  draft it would keep showing last season's board until January. It now opens
  on the current season once drafted. Pre-draft slots (`playerId -1`) no
  longer render as "Player -1".

After merging: run the `ESPN snapshot` Action once by hand so records.json
is rebuilt without the empty season.

Still open — needs Dor:
- `data/rules.json` looks out of date (says 9-cat, 15 rounds, weeks 22-24
  playoffs; the league scores points and ESPN shows 13 rounds). Validate.
- `data/draft-prep.json`: draft date and order still empty. ESPN already
  lists a 2026-27 draft order — confirm before copying it in.
- Playoffs page hardcodes "Play-In April 14–17 · Playoffs begin April 18"
  (2026 dates). Update when the NBA publishes 2027 dates.
- Teams/Records list "fake 23" and "Dor Gelless & the monkey comeback" as
  separate franchises — decide whether to hide or merge them.

## 1. Task A — Weekly recap  *(agreed priority #1)*

> **Defined 2026-08-19 — full spec in `docs/RECAP-SPEC.md`.** Read that first;
> it has the eight awards with tie-break rules, the code shape, the page
> layout, edge cases, and the one pipeline change needed. The summary below
> is kept for context.
>
> Two things settled while defining it:
> - The weekly-history worry was unfounded. `MatchupDepthRow` already carries
>   every completed week per team (scores, opponent, W/L, starter-games,
>   efficiency), so per-week superlatives and standings movement need **no**
>   snapshot changes.
> - "Most added player this week" **does** need a change: `getTransactions()`
>   fetches per scoring period but discards the period when tallying. See
>   §4 of the spec. One nightly run backfills all past weeks afterwards.

**Why:** the thing people screenshot into the group chat. The league's
favourite pages are the playoff bets pool, analytics/records, and the depth
pages — this feeds the same appetite without needing anyone to open ESPN.

**What to build:** a generated "week in review" for the just-finished matchup
week, at `/recap` (latest) and `/recap/[week]` (archive).

Sections, all computable from data we already have:

| Section | Source |
| --- | --- |
| Biggest blowout / closest game | `getMatchups()` per week, margin |
| Highest & lowest team score | same |
| Luckiest win (won with a low score) / unluckiest loss (lost with a high one) | week scores vs. league median |
| Manager of the week | best score-vs-projection, or best category sweep |
| Biggest riser / faller | standings delta week over week |
| Streamer of the week | most adds that week, from `getTransactions()` |

**Build notes**
- Compute in a pure module, e.g. `lib/recap.ts`, taking already-fetched data
  as arguments — that keeps it unit-testable like `lib/playoff-scoring.ts`.
  **Add tests**; the scoring tests caught a real crash bug last time.
- Read from the nightly snapshots (`lib/snapshots.ts`) rather than fanning out
  live ESPN calls, and follow the existing fallback pattern
  (snapshot → live → credentials notice).
- Weekly history needs per-week standings. Current snapshots hold latest-only,
  so either derive deltas from the schedule or extend the snapshot script to
  append a weekly series. **Decide this before building.**

---

## 2. Task B — Rivalries + power rankings  *(agreed priority #2)*

**Rivalry pages** — `/rivalries` index and `/rivalries/[a]-vs-[b]`:
all-time head-to-head record, every meeting with scores, biggest blowout,
closest game, current streak. The H2H data already exists — `getAllRecords()`
in `lib/espn-records.ts` returns `h2hMap` and `ownerNames`, and
`components/H2HMatrix.tsx` renders the grid. Make each matrix cell link to its
pair's page.

**Power rankings** — a ranking that disagrees with the standings on purpose,
with movement arrows (↑3 / ↓1) week over week. Blend record, points for,
recent form, and strength of schedule; show the formula on the page so the
league can argue about it. Same weekly-history dependency as the recap above,
so build them in that order.

---

## 3. Open decisions (need Dor)

1. **Weekly history storage** — how to get per-week standings for deltas
   (see Task A build notes). Extending the snapshot script is the cleaner
   option but changes the pipeline.
2. **Owner identity palette** — the contrast audit still flags owner colours
   used as 8-10px initials and a few status colours as small text, at
   3.8-4.3:1 against a 4.5 target. Closing the gap means retuning
   `OWNER_COLORS` in `lib/owner-meta.ts`, which changes how each person's
   colour looks everywhere. Design call, not a bug fix.
3. **Bets Pool 2.0** — still deferred to before April 2027. Storage
   (GitHub-as-DB vs. Supabase) and results entry (assist vs. automatic vs.
   manual) get decided when that build starts. See `ROADMAP.md` Phase 4.

---

## 4. Environment gotchas learned the hard way

- **Always restart `next start` after `npm run build`.** A running server keeps
  serving HTML that points at the old CSS hash; the browser then gets a 400 for
  the stylesheet and renders with *no styles at all*. This silently produced
  false results twice — a contrast audit "found" black-on-navy text that did
  not exist, and a mobile audit reported every page as passing because nothing
  had any width. Verify with a page load that the CSS response is `200`.
- **`pkill -f next-server` kills the shell running it**, because the pattern
  matches its own command line. Use `pkill -f 'next-serv[e]r'`.
- **Use `./node_modules/.bin/tsc`, not `npx tsc`** — `npx` sometimes resolves a
  global TypeScript 6 instead of the project's TypeScript 5 and prints help
  text rather than typechecking.
- **Inline styles beat Tailwind classes.** Four grids set
  `gridTemplateColumns` inline next to a responsive class, so they never
  collapsed on phones. If a responsive class appears not to work, check for an
  inline style on the same element first.
- The dev server has no ESPN credentials, so ESPN-backed pages render their
  fallback. Pages with committed data (playoffs, history, rules, draft-prep)
  render fully and are the best targets for visual checks.

## 5. Verification commands

```bash
npm run lint
./node_modules/.bin/tsc --noEmit
npm test                     # 34 tests, includes the 2025-26 golden regression
npm run build
pkill -f 'next-serv[e]r'; ./node_modules/.bin/next start   # then browse :3000
```

The browser audit scripts written this session (contrast in both themes,
mobile overflow/tap-target sweep) lived in the session scratchpad and are
**gone** — the container is ephemeral. If they're wanted again, either rewrite
them or, better, commit them under `scripts/audit/` so they persist.

## 6. Still open from earlier phases

- Phase 3 steady state: mobile polish, cookie refreshes when the snapshot
  Action emails a failure.
- `data/draft-prep.json` still has `draftDate: null` and an empty
  `draftOrder` — fill in once the league picks a date.
