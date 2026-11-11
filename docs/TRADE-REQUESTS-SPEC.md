# Trade requests — specification

Defined with Dor on 2026-11-11. Builds on the weekly trade suggestions
(`docs/TRADE-SUGGESTIONS-SPEC.md`).

**Purpose:** owners ask Claude about one player, on their own `/trades/<owner>` page:

- **Trade my player** (`sell`) — "I want to trade X. What can I get?"
- **I want a player** (`buy`) — "I want Y. What can I offer his owner?"

Claude answers with a short summary and up to 3 checked trade ideas, shown with
the same cards as the weekly ideas.

---

## 1. Decisions (Dor, 2026-11-11)

| Question | Decision |
| --- | --- |
| How it runs | **Request queue.** The site saves the request; a Claude Code scheduled task answers all pending requests a few times a day. No API key |
| When | 09:47, 15:47, 21:47 Israel time (`CRON_TZ=Asia/Jerusalem 47 9,15,21 * * *`). The page shows the next run rounded to the hour ("about 16:00") |
| Model | **Sonnet 5.5** for these runs (less plan usage). The Monday run stays on Opus |
| Limit | **2 requests per owner per day** (Israel day). The commissioner has no limit |
| Who can see it | Owner only — same passcode as the weekly page |
| Language | English |

## 2. Flow

```
Owner on /trades/<owner> → picks sell/buy + a player (+ optional note) → Send
  server action (app/trades/request-actions.ts)
    → checks the session, the trade deadline, live ESPN rosters, the daily limit
    → appends a `pending` request to data/trade-requests/<season>/<slug>.json
      via the GitHub contents API (GITHUB_TOKEN) → commit on main

Scheduled task "Trade request answers" (fresh session, Sonnet)
  → skill .claude/skills/trade-requests/
    1. pending.mts — "0 pending" → stop (cheap run)
    2. trade-data.mts (same ESPN input as Monday)
    3. Claude writes trades/answers.json
    4. answer.mts checks it; --write marks the requests `answered`
    5. commit + push to main

Owner's page reads the file through the GitHub API (no cache) → sees the answer
```

Requests are read and written through the GitHub API, so they show at once,
without waiting for a Vercel redeploy.

## 3. Data

`data/trade-requests/<season>/<slug>.json` — one file per owner:

```json
{
  "season": 2027,
  "owner": "Dor Barda",
  "requests": [
    {
      "id": "2026-11-11T08-15-03-123Z-ab12",
      "kind": "sell",
      "playerId": 4065648,
      "playerName": "…",
      "playerOwner": "Dor Barda",
      "note": "I need a center",
      "createdAt": "2026-11-11T08:15:03.123Z",
      "by": "owner",
      "status": "answered",
      "answer": {
        "answeredAt": "…",
        "inputGeneratedAt": "…",
        "summary": "…",
        "trades": [ /* TradeIdea, same as the weekly file */ ]
      }
    }
  ]
}
```

Types and checks: `lib/trade-requests.ts` (pure, tested in
`lib/__tests__/trade-requests.test.ts`). Storage: `lib/trade-requests-store.ts`.

## 4. Checks on an answer

Same checks as the weekly ideas (`checkTradeIdeas` / `checkProse` in
`lib/trade-output.ts`): players on the right rosters, no pickups (under 7 days),
1–3 players per side, angles and sell-high / buy-low wording, no invented
numbers, no "bench". Plus:

- Every pending request gets exactly one answer.
- **sell:** every idea gives the requested player. **buy:** every idea gets him
  (so the partner is whoever has him now).
- If the player can't be traded any more (traded, dropped, a fresh pickup, or a
  buy for a player now on the owner's own team), the answer has **no trades** and
  the summary says why.

## 5. Setup

- Vercel env: `GITHUB_TOKEN` must be able to write repo contents (already used by
  the playoff results editor). Without it the form is hidden.
- The scheduled task needs the same environment as the Monday task (`ESPN_S2`,
  `SWID`, `LEAGUE_ID`).
- After the trade deadline the form is hidden.
