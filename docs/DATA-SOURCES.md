# Free data sources for Fantasy HQ

Research pass, 2026-08-19. Scope agreed with Dor: **free** sources only —
public/no-key endpoints and free tiers that need a key — aimed at three
enhancements, in priority order:

1. **Schedule & rest** — games per week per NBA team, back-to-backs, light/heavy weeks
2. **Injuries & player news** — status, headlines, day-to-day vs. out
3. **Advanced & per-game stats** — usage, minutes trends, hot/cold form

> ### How to read the confidence column
>
> The session that wrote this ran behind an egress proxy that **blocked every
> sports host** (`cdn.nba.com`, `stats.nba.com`, `api.balldontlie.io`,
> `thesportsdb.com`, `lm-api-reads.fantasy.espn.com`, `sports.core.api.espn.com`
> — all 403 at CONNECT). So **no endpoint below was called live from here.**
>
> - **In use** — Fantasy HQ already calls it in production; proven.
> - **Documented** — confirmed from source code of a maintained client or from
>   endpoint documentation, but not executed by me.
> - **Reported** — vendor's own marketing/docs claim; verify before relying on it.
>
> Run `node scripts/probe-sources.mjs` from your machine to turn "documented"
> into "verified" — it hits every endpoint here and prints status, size and a
> shape summary.

---

## 0. What Fantasy HQ already uses

| Source | Auth | Where |
| --- | --- | --- |
| `lm-api-reads.fantasy.espn.com/.../games/fba/seasons/{y}/segments/0/leagues/{id}` | `espn_s2` + `SWID` cookies | `lib/espn.ts`, `lib/espn-records.ts`, `lib/espn-history.ts`, `lib/espn-draft.ts` |
| Views: `mTeam` `mMatchup` `mMatchupScore` `mScoreboard` `mStandings` `mRoster` `mSettings` `mNav` `mTransactions2` `kona_player_info` | same | as above |
| `site.api.espn.com/apis/common/v3/.../athletes/{id}` | none | `lib/espn.ts:940`, `lib/espn-draft.ts:131` — player name/team backfill |
| `site.api.espn.com/apis/v2/sports/basketball/nba/standings` | none | `lib/nba.ts:77` |
| `cdn.nba.com/.../todaysScoreboard_00.json` | none | `lib/nba.ts:32` |
| `stats.nba.com/stats/leagueleaders` | none (spoofed headers) | `lib/nba.ts:145` |

The important consequence: **you already own the two hardest things** — a
working ESPN cookie session and a nightly snapshot pipeline
(`scripts/build-snapshots.mts` → `data/snapshots/*.json`). Most of the value
below is unlocked by asking endpoints you already have permission to call, not
by adding a vendor.

---

## 1. ESPN Fantasy API — what you're not asking for yet

Highest value per unit of effort. Same host, same cookies, same cache and
snapshot patterns. Nothing new to configure.

### 1.1 NBA pro schedule → games per week, back-to-backs ★ priority 1

**`view=proTeamSchedules_wl`** returns the full NBA season schedule keyed by
pro team — which is exactly the games-per-week signal a weekly H2H league runs
on. *Confidence: documented* (used by the maintained `cwendt94/espn-api`
client's pro-schedule call).

**Gotcha:** it lives at the **season** level, not the league level. Your `BASE`
in `lib/espn.ts:24` ends in `/segments/0/leagues/{LEAGUE_ID}`, so `espnFetch()`
can't reach it. It needs a sibling helper:

```ts
// season-level endpoint — note: no /segments/0/leagues/{id} suffix
const SEASON_BASE =
  `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${SEASON}`;

async function espnSeasonFetch(params: string) {
  const res = await fetch(`${SEASON_BASE}${params}`, {
    headers: { Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}`, Accept: 'application/json' },
    next: { revalidate: 86400 },   // schedule changes rarely — cache hard
  });
  if (!res.ok) throw new Error(`ESPN season API ${res.status}`);
  return res.json();
}

const schedule = await espnSeasonFetch('?view=proTeamSchedules_wl');
```

You already have the `proTeamId → tricode` map (`PRO_TEAMS`, `lib/espn.ts:45`),
so joining schedule to roster is a few lines.

**What it powers:** games-per-week per roster, "heavy week / light week" badges
on `/matchups`, a back-to-back column on `/teams`, streaming advice on
`/draft-prep`, and a schedule-strength term for the power rankings in
`NEXT-SESSION.md` §2. This is the single best addition on the list.

**Fallback if that view disappears:** `site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{id}/schedule`
(no auth, per team, 30 calls) gives the same thing more verbosely.

### 1.2 Stat splits: last 7 / 15 / 30 and projections ★ priority 3

ESPN keys each stat block by a **prefixed id**: `00` = season total, `10` =
projected, `01` = last 7, `02` = last 15, `03` = last 30, concatenated with the
season year (`012026` = last-7 for 2026). *Confidence: documented*
(`espn_api/basketball/constant.py`).

Today `lib/espn.ts:326` asks only for
`filterStatsForTopScoringPeriodIds: { value: 7 }` — one split. Requesting the
`01`/`02`/`03` splits gives real **form** data: last-15 and last-30 next to
season average is how you show a player heating up or fading, and it's the
honest input for "Manager of the Week" and power-ranking recent-form terms.

```ts
await espnFetch('?view=kona_player_info', {
  'x-fantasy-filter': JSON.stringify({
    players: {
      limit: 500,
      // ask for several split blocks at once
      filterStatsForTopScoringPeriodIds: { value: 7 },
      filterRanksForScoringPeriodIds:    { value: [currentScoringPeriod] },
    },
  }),
});
```

The split blocks arrive inside each `player.stats[]` — filter by
`stat.id.startsWith('01' | '02' | '03')` rather than by `statSourceId` alone.
`lib/scoring.ts`'s `extractPerGameStats` already does the per-game division;
it needs a split-selector argument, not a rewrite.

ESPN exposes ~46 fantasy basketball metrics including `FG%`, `FT%`, `AFG%`,
`A/TO` — several you don't surface yet.

### 1.3 Injury status — already in the payload ★ priority 2

Player objects carry **`injuryStatus`** (`ACTIVE` / `DAY_TO_DAY` / `OUT` /
`SUSPENSION`) and **`injured`** (boolean) on the same `mRoster` and
`kona_player_info` responses you already fetch. *Confidence: documented.*

This is free — zero new requests. Reading two fields you're currently
discarding puts an injury dot on every roster row, `/teams`, `/matchups` and
the recap. **Do this first; it's the cheapest win in the document.**

### 1.4 Player news ★ priority 2

```
GET https://site.api.espn.com/apis/fantasy/v3/games/fba/news/players?playerId={id}
```

No cookies needed. *Confidence: documented* (`espn_api/requests/constant.py`
defines `NEWS_BASE_ENDPOINT = "https://site.api.espn.com/apis/fantasy/v3/games/"`).

Fantasy-flavoured blurbs — the "what does this mean for your roster" text, not
generic sports news. Fetch only for injured or recently-added players and cache
hard; one call per player doesn't scale to a whole league at request time. This
belongs in the nightly snapshot.

### 1.5 Ownership % and trends → fixes the Hot Pickup gap

`kona_player_info` returns an `ownership` object per player:
`percentOwned`, `percentChange`, `percentStarted`, `averageDraftPosition`.
Sortable via the filter header:

```ts
'x-fantasy-filter': JSON.stringify({
  players: {
    filterStatus: { value: ['FREEAGENT', 'WAIVERS'] },
    sortPercOwned: { sortPriority: 2, sortAsc: false },
    limit: 50,
  },
})
```

*Confidence: documented.* `percentChange` is league-wide add/drop momentum —
a "rising players" module for `/draft-prep` and the waiver conversation, and a
sanity check against your own league's adds.

### 1.6 League activity feed — richer than `mTransactions2`

**`view=kona_league_communication`** with
`filterType: "ACTIVITY_TRANSACTIONS"` and message-type ids
`[178, 180, 179, 239, 181, 244, 188]` returns the league activity stream —
FA adds (178), waiver adds (180), drops, trades (244) — **each carrying its
scoring period**. *Confidence: documented.*

This matters specifically: `NEXT-SESSION.md` and `docs/RECAP-SPEC.md` §4 note
that **Hot Pickup is blocked** because `getTransactions()` fetches per scoring
period but discards the period when tallying. The communication view is an
alternative route to per-week adds that may avoid the per-period fan-out in
`lib/espn.ts:853` entirely — worth a spike before extending the snapshot
schema.

### 1.7 Other views worth a look

| View | Returns | Use |
| --- | --- | --- |
| `kona_playercard` | Deep single-player card: splits, ranks, outlook | A player detail page |
| `mDraftDetail` | Draft picks + keeper info | You use it in `espn-draft.ts`; also carries ADP |
| `mPositionalRatings` | Positional scoring ratings | Positional scarcity for draft prep |
| `mLiveScoring` | In-progress scoring | Live matchup page during game nights |
| `mStatus` | `latestScoringPeriod`, season state | You read this off other views; it's cheaper alone |
| `players_wl` (season level) | All active NBA players, `filterActive: {value: true}` | Player universe without a league scope |

---

## 2. ESPN public endpoints — no key, no cookies

Base: `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/`.
*Confidence: documented* (community endpoint catalogue). You already call
neighbours of these successfully from Vercel, so the host is reachable from
your infrastructure.

| Endpoint | Returns | Fits |
| --- | --- | --- |
| `injuries` | **League-wide injury report** | Priority 2 — one call for the whole league, no per-player fan-out |
| `teams/{id}/schedule` | Full team schedule | Priority 1 fallback |
| `athletes/{id}/gamelog` | Game-by-game log | Priority 3 — real per-game history |
| `athletes/{id}/news` | Player news articles | Priority 2 |
| `news` | League news feed | A "league wire" strip on the home page |
| `scoreboard?dates=YYYYMMDD` | Games for a date | Backfilling past nights |
| `summary?event={id}` | Full box score for a game | Deep dives on a player's night |
| `teams` | All teams: logos, colours, records | Free branding assets |

Deeper analytics live on `sports.core.api.espn.com/v2/sports/basketball/leagues/nba/`
(`athletes/{id}/statisticslog`, `leaders`, `events/{id}/competitions/{id}/odds`).
Same no-auth pattern, more verbose ref-link structure — every object is a URL
you have to follow, so budget more requests.

**Caveat:** ESPN retired its official public API in 2014. Everything here is
undocumented and internal, discovered by reverse-engineering, and can change
without notice. For a private friends' league this is normal practice and low
risk; don't republish or resell the data. Cache aggressively and always keep
the fallback path you already use (snapshot → live → notice).

---

## 3. NBA official endpoints — free, but read the warning

### 3.1 `cdn.nba.com` — static JSON, no key, no rate limit

| URL | Returns |
| --- | --- |
| `/static/json/staticData/scheduleLeagueV2_1.json` | **Full season schedule**, every game, `leagueSchedule.gameDates[].games[]` with `gameId`, date, `homeTeam`, `awayTeam` |
| `/static/json/liveData/scoreboard/todaysScoreboard_00.json` | Today's games — **already in `lib/nba.ts`** |

*Confidence: documented.* The schedule file is a genuinely good priority-1
source: one request, whole season, no auth. Big file — fetch it in the nightly
snapshot, not per request.

### 3.2 `stats.nba.com` — powerful, and probably already failing for you

The deep well: `LeagueDashPlayerStats`, `PlayerGameLogs`, `BoxScoreAdvancedV2`,
`LeagueHustleStatsPlayer`, `TeamEstimatedMetrics`, `BoxScoreFourFactorsV2`.
Usage rate, pace, hustle, four factors — the real advanced-stats layer.

> ⚠️ **The NBA blocks cloud-provider IP ranges** (AWS, DigitalOcean, Heroku and
> similar). Requests from those hosts hang or fail; the same code works from a
> laptop. *Confidence: documented, widely reported.*

**This likely already affects Fantasy HQ.** `fetchStatLeaders()`
(`lib/nba.ts:142`) swallows every error into `return []`, and `/nba`
renders empty leader lists silently — so a total block looks identical to
"no data yet". **Check whether the stat leaders on `/nba` actually render in
production.** If they're empty, that's why, and the fix is to move those calls
into the nightly snapshot only if GitHub's runners aren't blocked too (they're
Azure-hosted, so test rather than assume), or to replace them with ESPN's
`leaders` endpoint, which you know is reachable.

### 3.3 Two bugs found while mapping this

Not the assignment, but they'll bite at the season rollover — both hardcode a
season that `lib/season.ts` is supposed to own:

- `lib/nba.ts:77` — `standings?season=2026` hardcoded
- `lib/nba.ts:145` — `Season=2025-26` hardcoded

Everything else derives from `SEASON`; these two don't, so `/nba` will quietly
show last season's data after the switch. `lib/season.ts` would need a
`NBA_SEASON_STRING` helper (`2026` → `"2025-26"`) for the second one.

---

## 4. Free tiers that need a key

None of these are necessary given sections 1–3. Ranked by whether they'd earn
the extra secret in Vercel.

| Provider | Free tier | NBA coverage | Verdict |
| --- | --- | --- | --- |
| **Big Balls Data** (`bigballsdata.com`) | 1,000 req/day (2,000 via GitHub), no card | Scores, box scores, play-by-play back to 1946, standings, **injuries refreshed ~30 min** | *Reported.* Best free injury feed found. Worth a spike **only if** ESPN's `injuries` endpoint disappoints. Young vendor — don't make it load-bearing |
| **API-Sports / API-NBA** | 100 req/day | Teams, players, standings, games, stats, odds, injuries | *Reported.* 100/day is tight, but a nightly snapshot needs ~10. Mature, documented, stable |
| **balldontlie** | 5 req/min, key required | Players, teams, games, stats; advanced stats and injuries sit in paid tiers ($9.99+/mo) | *Reported.* The classic free NBA API is now mostly paywalled for the things you'd want. Skip |
| **TheSportsDB** | 30 req/min, public key `123` | Teams, players, logos, images, some scores | *Reported.* Good for **branding assets** — logos, player images, team colours. Thin for stats |
| **Highlightly** | 100 req/day, no card | Scores, stats, highlights across many leagues | *Reported.* Highlight video links are the differentiator; peripheral for you |

**Recommendation: add none of them yet.** Sections 1 and 2 cover all three
priorities using credentials and hosts you already run. Revisit only if the
ESPN injuries endpoint turns out to be thin.

---

## 5. Ranked plan

Ordered by value ÷ effort, mapped to the roadmap in `NEXT-SESSION.md`.

| # | Change | Source | Effort | Payoff |
| --- | --- | --- | --- | --- |
| 1 | **Injury dots everywhere** — read `injuryStatus` / `injured` off responses you already fetch | §1.3 | ~1h | Visible on every roster view, zero new requests |
| 2 | **Games-per-week / back-to-backs** — `proTeamSchedules_wl` + season-level helper, into the nightly snapshot | §1.1 | ~half day | The signal a weekly H2H league actually plays on. Feeds power rankings |
| 3 | **Form splits (L7/L15/L30)** — extend the existing `kona_player_info` call | §1.2 | ~half day | Hot/cold on `/teams`, honest recent-form term for rankings |
| 4 | **League-wide injury report page** — ESPN `injuries`, one call | §2 | ~2h | A page the league checks before lineups lock |
| 5 | **Hot Pickup unblock** — spike `kona_league_communication` for per-week adds | §1.6 | ~half day | Closes the one open award in `docs/RECAP-SPEC.md` §4 |
| 6 | **Player news on injured/added players** — nightly, cached | §1.4 | ~half day | Context in the recap without opening ESPN |
| 7 | **Fix the two hardcoded seasons** in `lib/nba.ts` | §3.3 | ~30m | Prevents a silent wrong-season page in October |
| 8 | **Verify `/nba` stat leaders render in production** | §3.2 | ~15m | May already be broken; decides whether to move or replace the call |

Items 1–3 are the ones I'd actually build. They serve all three stated
priorities, add **no new vendor, no new secret, and no new failure mode** — every
one goes through the ESPN session and snapshot pipeline you already operate.

---

## 6. Risks and house rules

- **Everything here is unofficial.** ESPN and NBA endpoints are internal, can
  change without notice, and publish no rate limits. Keep the
  snapshot → live → graceful-notice fallback you already have; it's what makes
  these safe to depend on.
- **Private, non-commercial use only.** Don't republish or resell. A private
  friends' league is the low-risk case; keep it that way.
- **Cache to the shape of the data.** Schedule: daily. Splits and ownership:
  nightly. Injuries: hourly at most. Live scores: minutes. Prefer the nightly
  snapshot for anything analytical — it's already your cookie-expiry safety net.
- **Cloud IP blocking is real for `stats.nba.com`** and invisible in your
  current error handling (see §3.2). Any new NBA-host call should log its
  failure rather than silently return `[]`.
- **Don't let a new source become load-bearing** without a fallback. The
  snapshot pipeline's "never write empty results" rule should extend to
  anything added here.

---

## Sources

- [Public-ESPN-API — undocumented ESPN endpoint catalogue](https://github.com/pseudo-r/Public-ESPN-API)
- [cwendt94/espn-api — maintained ESPN fantasy client (basketball)](https://github.com/cwendt94/espn-api)
- [swar/nba_api — NBA.com stats endpoint catalogue](https://github.com/swar/nba_api)
- [Working Around NBA.com's IP Ban for Cloud-Hosted Apps](https://medium.com/@inman.justin/working-around-nba-coms-ip-ban-for-cloud-hosted-nba-api-apps-90326ab2632c)
- [bttmly/nba — documents the same cloud-IP block and a proxy workaround](https://github.com/bttmly/nba/blob/master/README.md)
- [Big Balls Data — NBA API and injuries](https://bigballsdata.com/nba-api)
- [API-Sports — NBA API](https://api-sports.io/sports/nba)
- [balldontlie](https://www.balldontlie.io/)
- [TheSportsDB — free API documentation](https://www.thesportsdb.com/documentation)
- [ESPN API: official or unofficial](https://espnapi.com/official-espn-api-available-to-the-public-find-out/)
- [ffscrapr — ESPN endpoint and x-fantasy-filter reference](https://ffscrapr.ffverse.com/articles/espn_getendpoint.html)
