# Next session — pick up here

Written 2026-08-19 at the end of the design pass. This file is self-contained:
a fresh chat with no history should be able to read it and continue.

---

## 0. Where things stand

**Branch:** `claude/nba-fantasy-review-ri3x0e` — **6 commits ahead of `main`,
not merged, no PR open.** Nothing on this branch is live yet.

```
29203c4  Visual refresh: meaningful colour, real avatars, a type scale
fd77f30  Fix mobile layout issues across the site
65d31b6  Migrate to design tokens and add dark mode
d2250e0  Fix mobile horizontal scrolling across the site
f9920cd  Add draft prep page for the off-season
34f309d  Add new-season switch: season config and per-year playoff data
```

Everything is green: `npm run lint`, `./node_modules/.bin/tsc --noEmit`,
`npm test` (34 tests), `npm run build`.

**Already live on `main`** (merged earlier): Next 15 / React 19 upgrade,
scoring tests + CI, nightly ESPN snapshot pipeline, secured admin endpoint,
`main` branch rename. See `ROADMAP.md` for the full ledger.

### Step 0 — the first thing to do

Open a PR for the branch and merge it, or the design work stays invisible:
https://github.com/dorbarda/FantasyHQ/compare/main...claude/nba-fantasy-review-ri3x0e

---

## 1. Task A — Weekly recap  *(agreed priority #1)*

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
