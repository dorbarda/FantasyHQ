# FantasyHQ Roadmap — 2026 off-season → 2026-27 season

Decided 2026-08-18 after the off-season review. Phases 1–3 are active work;
Bets Pool 2.0 is planned but deferred until the season work is done.

## Phase 1 — Platform hygiene (now → September)

- [x] Upgrade Next.js 14 → 15, React 18 → 19, ESLint 8 → 9
      (clears the 5 open Next 14 security advisories)
- [x] Unit tests for `lib/scoring.ts` and `lib/playoff-scoring.ts`, wired into CI
- [x] Rename default branch `claude/fantasy-hq-mvp-ScUru` → `main`
      (GitHub rename + Vercel branch tracking done 2026-08-18; admin API
      default branch updated to `main` in code)
- [x] Repo cleanup: remove `design_handoff_playoff_tabs/` and duplicate
      root `logo.png`

## Phase 2 — Season-proofing (September → October tip-off)

- [x] Nightly snapshot pipeline: `espn-snapshot` Action runs
      `scripts/build-snapshots.mts` nightly, commits `data/snapshots/*.json`;
      records/history/transactions/depth/analysis pages read snapshots
      first; Action failure (expired cookies) alerts by email; empty
      results are rejected so bad cookies can't wipe good data
      (needs `ESPN_S2`/`SWID`/`LEAGUE_ID` repo secrets set once)
- [x] New-season switch: `lib/season.ts` single source; playoff pool data
      per-year under `data/playoffs/<year>/` with generic archive route
      `/nba-playoffs/[year]`; new season = set `SEASON` env var
- [ ] Draft prep page: draft order, last season's draft value hits/busts

## Phase 3 — In-season (October → March)

- [ ] Steady state: mobile polish, small fixes, cookie refreshes when the
      pipeline alerts

## Phase 4 — Bets Pool 2.0 (DEFERRED — build before April 2027)

Planned, not scheduled. Open choices (storage, results entry) get decided
when the build starts.

- [ ] Self-serve bet submission: per-owner passcode, full bracket form
      (play-in, series winners + scores, bonus bets), hard deadline lock
- [ ] Storage decision: GitHub-as-DB (like today's admin flow) vs.
      Supabase/Vercel Postgres
- [ ] Series results assist: pre-fill the admin page from the public NBA
      scoreboard API (`lib/nba.ts`), commissioner confirms — decide between
      assist / fully automatic / manual at build time
- [ ] Pool archive as a template: every year auto-preserved under
      `/nba-playoffs/<year>` (generalize the 2026 one-off page)

## Done (this branch)

- [x] Secure `/api/update-playoff-result` behind `ADMIN_KEY` passcode
- [x] Remove `/api/debug-*` routes
- [x] Fix dead `/stats` home quick-link
- [x] `npm audit fix` (dev tooling) + add `sharp`
- [x] Real README; CI workflow (lint, typecheck, build)
