# FantasyHQ Roadmap — 2026 off-season → 2026-27 season

Decided 2026-08-18 after the off-season review. Phases 1–3 are active work;
Bets Pool 2.0 is planned but deferred until the season work is done.

## Phase 1 — Platform hygiene (now → September)

- [ ] Upgrade Next.js 14 → 15, React 18 → 19, ESLint 8 → 9
      (clears the 5 open Next 14 security advisories; re-verify all
      `revalidate`/caching behavior, which changed in Next 15)
- [ ] Unit tests for `lib/scoring.ts` and `lib/playoff-scoring.ts`, wired into CI
- [ ] Rename default branch `claude/fantasy-hq-mvp-ScUru` → `main`
      (checklist: GitHub rename → Vercel production-branch setting →
      `GITHUB_BRANCH` env var for the admin API — changed together)
- [ ] Repo cleanup: archive `design_handoff_playoff_tabs/`, remove duplicate
      root `logo.png`

## Phase 2 — Season-proofing (September → October tip-off)

- [ ] Nightly snapshot pipeline: scheduled GitHub Action runs
      `scripts/fetch-espn-data.mjs`, commits snapshots to `data/`;
      analytics/records/depth pages read snapshots instead of fanning out
      live ESPN calls; Action failure (expired cookies) alerts by email
- [ ] New-season switch: single source of truth for the active season;
      per-year archive folders (`data/<year>/…`) so history accumulates
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
