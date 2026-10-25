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
Monday ~08:00 Israel  (after the 06:00 UTC nightly snapshot)
  scheduled task → new Claude session (Opus 5.5)
    → runs skill  .claude/skills/trade-suggestions/
        1. npx tsx .claude/skills/trade-suggestions/trade-data.mts --out trades/input.json
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

## 3. Data the skill gets (`input.json`)

All from existing snapshots / loaders — no new ESPN endpoints needed for v1.

| Need | Source | Status |
| --- | --- | --- |
| Rosters (all teams) | `getLeagueRosters()` | ✅ |
| Player season averages, injury status | `getPlayerPool()` (`kona_player_info`) | ✅ — confirm injury field |
| Recent form (last weeks) | `player-trends` snapshot | ✅ |
| Standings, record, points for/against | `getStandings()` | ✅ |
| Weekly scores, games used | `matchup-depth` snapshot | ✅ |
| Remaining schedule: games per week, back-to-backs per NBA team | `schedule` snapshot | ✅ |
| Remaining fantasy opponents | `getMatchups()` / schedule settings | ✅ |
| Moves used, trade history | `transactions` snapshot | ✅ |
| Playoff format, trade deadline | league settings (`mSettings`) | ⚠️ confirm field |

---

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

1. [ ] `trade-data.mts` + check `input.json` by hand for one team.
2. [ ] `SKILL.md` + `validate.mts`; dry run in a session, review output with Dor.
3. [ ] `lib/owner-auth.ts` + pages.
4. [ ] Scheduled task (Monday, Opus 5.5, new session each run).

---

## 8. Open questions (need Dor)

1. **Privacy of the stored file.** The advice is committed to the repo as
   JSON. Anyone with access to the GitHub repo can read every team's advice.
   Fine if only Dor has repo access — otherwise store it somewhere else
   (e.g. Vercel Blob). Who has access to the repo?
2. **Trade deadline date** and **playoff weeks** for 2026-27 — read them
   from ESPN settings, but Dor should confirm the numbers once.
3. **Should Claude see the advice it gave the other teams?** Yes means it
   can avoid suggesting the same player to 3 teams; it also means one run
   sees everyone's plans (fine, it's the same run).
4. Passcodes — who creates and sends them to the owners? (Suggest: Dor.)
