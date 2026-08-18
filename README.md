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

Set the `SEASON` env var (ending year — `2027` for the 2026-27 season) in the
Vercel project and as the GitHub Actions `SEASON` variable. Everything derives
from it via `lib/season.ts`: ESPN fetches, records/history/draft year lists,
and the playoffs page. Create `data/playoffs/<year>/` when the pool opens.

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

Without ESPN credentials the site still runs: ESPN-backed pages show a
"credentials required" notice or fall back to the committed JSON.

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
