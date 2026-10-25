# AI Trade Suggestions — specification

Defined with Dor on 2026-10-25. Build target: `/trades` and `/trades/[owner]`.

**Purpose:** every team gets a personal AI assistant for fantasy basketball.
Once a week Claude looks at each roster and tells its owner what is wrong with
the team and which trades would help it reach the playoffs and win the league.

---

## 1. Decisions (Dor, 2026-10-25)

| Question | Decision |
| --- | --- |
| How it runs | **Claude Code scheduled task**, every Monday, runs a repo skill. Model: Opus 5.5. No API key — uses the Claude plan |
| What it suggests | **Trades only** — between league teams. No free-agent add/drop ideas |
| Who can see it | **Owner only** — each team page is locked with that owner's passcode |
| Language | **English** |

---

## 2. Weekly flow

```
Monday ~10:00 Israel  (Sunday's late NBA games are final; Monday 00:00 US Pacific)
  scheduled task → new Claude session (Opus 5.5)
    → runs skill  .claude/skills/trade-suggestions/
        1. npx tsx .claude/skills/trade-suggestions/trade-data.mts --out trades/input.json   (✅ built)
        2. Claude reads input.json, writes one analysis per team
        3. validate script checks every number and player against input.json
        4. writes data/trades/<season>/week-NN.json, commits, pushes to main
  → Vercel redeploys (~1 min) → owners see the new advice
```

- One run covers every team, so every suggestion sees the whole league.
- File is written once per week and never overwritten (like week projections),
  so we keep an archive and can later check if the advice was good.
- Stops after the ESPN trade deadline (read from league settings). The page
  then shows "trade deadline passed".

---

## 3. Data the skill gets (`input.json`) — ✅ built

`lib/trade-input.ts` (pure, tested in `lib/__tests__/trade-input.test.ts`)
plus `.claude/skills/trade-suggestions/trade-data.mts` (one live ESPN call:
`mTeam mRoster mMatchup mSettings`, plus the NBA schedule). `trades/` is
git-ignored; the file is ~130 KB.

| Field | Per | Source |
| --- | --- | --- |
| Record, points for/against, seed, division | team | `teams[].record`, `playoffSeed` |
| Moves (acquisitions, drops, trades) | team | `transactionCounter` |
| Regular-season opponents from this week on | team | `schedule` |
| Positions, lineup slot (starter/bench/IR), injury status | player | roster entry |
| Avg fantasy points: season, last 7/15/30 days, last season, ESPN projection | player | ESPN `appliedAverage` — never recomputed. No games in the span → `null`, not 0 |
| League rank by season avg and by projection | player | among all rostered players |
| NBA games: this week, rest of regular season, playoffs (per round) | player | NBA schedule × fantasy periods |

### League settings (read from ESPN `mSettings`, 2026-10-25)

| Setting | Value |
| --- | --- |
| Teams | 10, two divisions |
| Scoring | H2H points |
| Regular season | weeks 1–18, ends Sun 2027-02-21 |
| Playoffs | 8 teams. Round 1: Feb 22 – Mar 7 (**2 weeks**). Semis: Mar 8–14. Final: Mar 15–21 |
| Seeding rule | `TOTAL_POINTS_SCORED` |
| Trade deadline | Mon 2027-03-08, 12:00 Israel |
| Trade review | 24 h, 4 veto votes cancel a trade |
| Lineup | PG, SG, SF, PF, C, G, F, 3 UTIL · 3 bench · 2 IR (15 players) |
| Moves | 1 per day of the matchup |

ESPN's `matchupPeriods` maps a fantasy week to calendar weeks; round 1 is
`19: [19, 20]`. The builder joins them, so playoff game counts are right.

## 4. What Claude writes per team

### 4.1 Team diagnosis

Short, plain-English check-up. Flags Claude can raise (only when the data
shows it):

- **No star power** — no player in the league's top tier by average.
- **Thin middle** — stars plus weak bench, nothing in between.
- **Too many similar players** — roster spots wasted on low-value depth.
- **Inactive manager** — few moves / trades compared to the league.
- **Tough schedule** — few NBA games or strong fantasy opponents ahead,
  especially in the weeks before and during the playoffs.
- **Injury risk** — key players out or day-to-day.
- **Playoff position** — where the team stands and what it needs
  (win now vs. build for the playoff weeks).

### 4.2 Trade ideas

Up to **3** trades per team, best first. Each one:

- Partner team, players given, players received (1-for-1, 2-for-1, 2-for-2).
- **Why it helps you** — tied to the diagnosis.
- **Why they would say yes** — what the other team gains. A trade the
  partner would never accept is useless, so every idea must be fair enough
  to be realistic.
- Key numbers: season average of each player, games left this week and in
  the playoff weeks.

### 4.3 Rules for Claude

- **Never invent a number.** Every number comes from `input.json`. The
  validate step rejects the file if a player or number doesn't match.
- Only players that are actually on the two rosters right now.
- No trade that breaks roster rules (positions, IR).
- Tone: honest, direct, a bit fun — but useful first.

### 4.4 Output shape

```ts
// data/trades/<season>/week-NN.json
{
  season: number;
  week: number;
  generatedAt: string;
  teams: {
    owner: string;            // matches OWNER_COLORS keys
    diagnosis: { summary: string; flags: string[] };
    trades: {
      partnerOwner: string;
      give: { playerId: number; name: string; avg: number }[];
      get:  { playerId: number; name: string; avg: number }[];
      whyForYou: string;
      whyTheyAccept: string;
    }[];
  }[];
}
```

---

## 5. Pages

- **`/trades`** — list of all teams with "last updated: Week N, Monday".
  No advice shown here.
- **`/trades/[owner]`** — asks for the owner's passcode, then shows:
  1. Header — team, record, standing, week.
  2. Diagnosis card — summary + flags as chips.
  3. Trade cards — give ⇄ get, the two "why" lines, key numbers,
     partner with `OwnerAvatar`.
  4. Archive — earlier weeks for this team.
- Design: same system as the rest of the site — tokens only, both themes,
  fits 390px.

### Passcode

- Vercel env var `OWNER_KEYS` = JSON `{ "<owner-slug>": "<passcode>" }`.
- Check happens on the server; on success set an httpOnly cookie for that
  owner only. Page is never cached / statically generated.
- Commissioner (`ADMIN_KEY`) can open every team.
- Same mechanism can be reused later by Bets Pool 2.0 (per-owner passcode).

---

## 6. Code shape

```
.claude/skills/trade-suggestions/SKILL.md      instructions + prompt for Claude
.claude/skills/trade-suggestions/trade-data.mts  builds input.json
.claude/skills/trade-suggestions/validate.mts    checks output vs input
lib/trades.ts                 load/parse week files (pure, tested)
lib/owner-auth.ts             passcode + cookie check
app/trades/page.tsx
app/trades/[owner]/page.tsx
lib/__tests__/trades.test.ts
```

---

## 7. Build order

1. [x] `trade-data.mts` + check `input.json` by hand for one team (2026-10-25).
2. [ ] `SKILL.md` + `validate.mts`; dry run in a session, review output with Dor.
3. [ ] `lib/owner-auth.ts` + pages.
4. [ ] Scheduled task (Monday, Opus 5.5, new session each run).

---

## 8. Settled (Dor, 2026-10-25)

1. **Repo access:** only Dor — storing the advice as JSON in the repo is fine.
2. **League settings:** read from ESPN, table in §3.
3. **Passcodes:** one random 4-character code per owner, generated
   2026-10-25 and sent to Dor in chat. **Never commit them.** They go into
   the Vercel env var `OWNER_KEYS` in step 3. Short codes → the login API
   needs a rate limit.

## 9. Open

1. Trade deadline (Mar 8) falls **after** the playoffs start (Feb 22), so
   trades are allowed during round 1. ESPN default? Change on ESPN if not wanted.
2. The site's own week map (`lib/espn-schedule.ts` `countMatchupPeriods` /
   `buildWeekMap`) treats every fantasy week as one calendar week, so from
   week 19 on the schedule page is off by one week. Not urgent before February.
