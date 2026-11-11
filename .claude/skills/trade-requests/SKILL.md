---
name: trade-requests
description: Answer owners' trade requests from the /trades pages ("I want to trade my player X" / "I want player Y") with up to 3 checked trade ideas each, saved to data/trade-requests/<season>/<owner>.json. Runs a few times a day from a scheduled task; use also when the user asks to answer, test or redo trade requests.
---

# Trade requests

Owners ask Claude about **one player** on their `/trades/<owner>` page:

- **SELL** — "I want to trade my player X. What can I get?" Every idea **gives X**.
- **BUY** — "I want player Y. What can I offer his owner?" Every idea **gets Y**,
  from whoever has him now.

The site saves each request as `pending`. This skill answers all of them.
Spec: `docs/TRADE-REQUESTS-SPEC.md`. Answers are in **English**.

## 1. Anything to do?

```bash
git pull origin main
npm ci
npx tsx .claude/skills/trade-requests/pending.mts
```

**`0 pending` → stop here.** Write nothing, commit nothing, don't fetch ESPN.
Finish with one line: "No trade requests."

## 2. Get the data

```bash
npx tsx .claude/skills/trade-suggestions/trade-data.mts --out trades/input.json --digest trades/input.md
```

Needs `ESPN_S2`, `SWID`, `LEAGUE_ID`. If the fetch fails (cookies expired),
**stop and report**, write nothing — the requests stay pending for the next run.

Read the digest header and the rosters of the requester and every team you
consider trading with. Columns are explained at the top.

## 3. Think

Follow section 2 of `.claude/skills/trade-suggestions/SKILL.md` (how to judge
players, realistic trades, angles, sell high / buy low wording, no pickups).
On top of that:

- **The request decides one side.** SELL: X is in `give` of every idea. BUY: Y
  is in `get` of every idea, and the partner is Y's **current** owner.
- Up to **3** ideas, best first. For SELL, try **different partners** — the owner
  wants to see the market. For BUY, offer **different packages** to the same owner
  (e.g. one star-for-star, one 2-for-1).
- Read the owner's **note** and respect it ("I need a center", "don't touch my
  stars"). If the note asks for something impossible, say so in the summary.
- Fair for both sides — the partner must want it. A lopsided "may say no" warning
  means rethink.
- **Can't be done** (the player was traded, dropped, is now a ⛔ PICKUP, or for
  BUY is already on the requester's team): answer with **no trades** and say why
  in the summary. Also no trades if nothing sensible exists — then say why.
- The summary (up to 700 characters) answers the question directly: what X is
  worth on the market / what it takes to get Y, and which idea you like most.

## 4. Write the answers

`trades/answers.json` — one answer per pending request:

```json
{
  "answers": [
    {
      "id": "2026-11-11T08-15-03-123Z-ab12",
      "summary": "…",
      "trades": [
        {
          "partnerOwner": "Barak Miller",
          "give": [4065648],
          "get": [3155942, 4433134],
          "angles": ["depth"],
          "whyForYou": "…",
          "whyTheyAccept": "…"
        }
      ]
    }
  ]
}
```

Same rules as the weekly ideas: players by **id**, owners exactly as in the
digest, "why" up to 400 characters, **never invent a number**, **never say
"bench"**. "you" = the owner who asked.

## 5. Check, save, publish

```bash
npx tsx .claude/skills/trade-requests/answer.mts trades/input.json trades/answers.json
```

Fix every ❌ and run again. When clean:

```bash
npx tsx .claude/skills/trade-requests/answer.mts trades/input.json trades/answers.json --write
git add data/trade-requests
git commit -m "chore: answer trade requests"
git pull --rebase origin main
git push origin HEAD:main
```

If the rebase conflicts (an owner sent a new request meanwhile):
`git rebase --abort`, `git reset --hard origin/main`, run the `--write` command
again (it re-reads the files and keeps the new request pending), commit, push.
`trades/` is git-ignored — never commit it.

Finish with one line per request: owner, SELL/BUY + player, number of ideas.
