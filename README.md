# Fantasy HQ 🏀

Private website for our friends' NBA fantasy league — live standings, matchups,
analytics, all-time records, and the NBA playoffs bracket-betting pool.

Built with [Next.js 14](https://nextjs.org) (App Router), TypeScript, Tailwind CSS,
and [Recharts](https://recharts.org). Deployed on Vercel.

## How data flows

The site has two data sources:

1. **ESPN Fantasy API (live)** — standings, matchups, rosters, stats, transactions,
   and draft data are fetched server-side at request time from our private ESPN
   league (`lib/espn*.ts`). Most fetches are cached for 30 minutes; live views
   (current matchups, playoff bracket) skip the cache.
2. **Committed JSON (`data/*.json`)** — everything ESPN doesn't own: playoff
   bets/results/fines for the betting pool, league history, rules. Some files
   (`standings.json`, `matchups.json`, …) also act as fallbacks rendered when ESPN
   credentials are missing. `scripts/fetch-espn-data.mjs` can snapshot live ESPN
   data into these files.

The playoffs admin page (`/nba-playoffs/admin`) saves series results by committing
`data/playoffs/<season>/results.json` to GitHub through the API, which triggers
a Vercel redeploy (~1 min). Each season's pool lives in `data/playoffs/<year>/`
(bets, results, fines) and past years render at `/nba-playoffs/<year>`.

### Starting a new season

Everything derives from one env var. `SEASON` is the **ending** year — `2027`
for the 2026-27 season — and `lib/season.ts` is the only place it's read.

> ⚠️ **Roll the ESPN league over first.** Switching `SEASON` points every ESPN
> call at that season's league. If the league doesn't exist on ESPN yet, those
> calls 404: live pages fall back to their "credentials required" notice, and
> the nightly snapshot Action goes **red** and emails you — which is the same
> alarm as expired cookies, so you'd be chasing the wrong problem. Confirm the
> league opens in the ESPN app for the new season, then switch.

Steps:

1. ESPN: confirm the league exists for the new season.
2. Vercel → Settings → Environment Variables → set `SEASON=2027` → redeploy.
3. GitHub → Settings → Secrets and variables → Actions → **Variables** tab →
   set `SEASON=2027`. (Variable, not secret — it isn't sensitive.)
4. Run the `ESPN snapshot` Action manually to refill `data/snapshots/` for the
   new season.
5. Create `data/playoffs/<year>/` when that season's pool opens.

Nothing else is year-aware: ESPN fetches, the NBA standings and stat-leaders
calls, records/history/draft year lists, the schedule grid, the playoffs page
and every on-screen season label all read `lib/season.ts`. Verified by building
and rendering the whole site under `SEASON=2027`.

### Nightly snapshots

The `espn-snapshot` GitHub Action runs `scripts/build-snapshots.mts` every
night (09:00 UTC), calls the heavy ESPN loaders, and commits the results to
`data/snapshots/*.json` — which triggers a Vercel redeploy on fresh data.
The analytical pages (records, history, transactions, matchup depth,
analysis) prefer these snapshots over live ESPN calls, so they stay fast and
keep working even when the ESPN cookies expire. A red Action run is the
expired-cookie alarm: GitHub emails the repo owner, and stale-but-valid
snapshots keep serving until the cookies are refreshed. Empty results are
never written, so a dead cookie can't wipe good data.

The Action needs repository **secrets** `ESPN_S2`, `SWID`, `LEAGUE_ID` and
optionally the **variable** `SEASON` (Settings → Secrets and variables →
Actions). Run it manually any time from the Actions tab (workflow_dispatch),
or locally with `npm run snapshots`.

`HIGHLIGHTLY_API_KEY` is an optional extra secret for recap highlight clips.
That snapshot is marked optional in `scripts/build-snapshots.mts`: if the key
is missing or the API fails, the job is skipped with a warning and the run
still passes — so a red run keeps meaning "the ESPN cookies expired".

Live pages (home, matchups, standings, playoff bracket, teams) still fetch
ESPN directly and need the same env vars on Vercel.

## Environment variables

Create `.env.local` (never committed) with:

| Variable | Purpose |
| --- | --- |
| `LEAGUE_ID` | ESPN fantasy league ID |
| `ESPN_S2` | ESPN auth cookie (grab from browser dev tools while logged in; expires periodically) |
| `SWID` | ESPN auth cookie, including the `{}` braces |
| `SEASON` | ESPN season year, e.g. `2026` for the 2025-26 season (defaults to `2026`) |
| `GITHUB_TOKEN` | Token with `contents:write` on this repo — used by the playoffs admin API |
| `GITHUB_BRANCH` | Branch the admin API commits to (defaults to the production branch) |
| `ADMIN_KEY` | Shared passcode for `/nba-playoffs/admin`; the admin API is disabled if unset |
| `HIGHLIGHTLY_API_KEY` | Optional. Highlight clips on the weekly recap ([highlightly.net](https://highlightly.net), free tier). Unset = no highlights, nothing else changes |
| `HIGHLIGHTLY_API_HOST` | Optional. Only needed if the key came from RapidAPI rather than Highlightly directly — set it to the RapidAPI host |

Without ESPN credentials the site still runs: ESPN-backed pages show a
"credentials required" notice or fall back to the committed JSON.

## Data sources

`docs/DATA-SOURCES.md` catalogues the free APIs and endpoints available to the
site — what ESPN's fantasy and public APIs expose beyond what we already call,
NBA.com's public JSON, and the free-tier vendors — with a ranked list of what's
worth building. Verify any endpoint before building on it:

```bash
npm run probe-sources   # hits every endpoint in the doc, reports what answers
```

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint       # ESLint
npx tsc --noEmit   # typecheck
npm run build      # production build
```

## Refreshing ESPN cookies

When live pages stop loading on production, the `espn_s2`/`SWID` cookies have
probably expired. Log in to ESPN Fantasy in a browser, copy the fresh cookie
values from dev tools (Application → Cookies), and update the env vars in the
Vercel project settings.
