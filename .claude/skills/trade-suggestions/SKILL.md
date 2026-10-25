---
name: trade-suggestions
description: Weekly AI trade suggestions for every team in the league — a diagnosis of each roster and up to 3 realistic trade ideas, saved to data/trades/<season>/week-NN.json for the owner-only /trades pages. Runs every Monday from a scheduled task; use also when the user asks to run, test or redo the trade suggestions.
---

# Weekly trade suggestions

Every Monday each owner gets a personal fantasy assistant: what is wrong with
their team, and which trades would help them make the playoffs and win the
league. Spec: `docs/TRADE-SUGGESTIONS-SPEC.md`. Advice is in **English**.
**Trades only** — between league teams, no free-agent pickups.

## 1. Get the data

```bash
git pull origin main
npm ci
npx tsx .claude/skills/trade-suggestions/trade-data.mts --out trades/input.json --digest trades/input.md
```

- Needs `ESPN_S2`, `SWID`, `LEAGUE_ID` (env or `.env.local`). `SEASON` defaults to 2027.
- A test on another week: add `--week N`.
- **Stop and report, write nothing**, if: the fetch fails (cookies expired),
  the trade deadline in the digest header has passed, or
  `data/trades/<season>/week-NN.json` already exists for this week — unless
  it was written before the week began (an early preview): then go ahead,
  `--write` replaces it.

Read **all of** `trades/input.md` before writing anything — one line per
player, columns explained at the top. `trades/input.json` has the same data.

## 2. Think like a fantasy analyst

League facts (all in the digest header): H2H **points**, 10 teams, **8 make
the playoffs**, regular season weeks 1–18, playoffs Mar 1–28 (round 1 is two
weeks). So for most teams the goal is not "make the playoffs" but **win the
playoff weeks** — and for the bottom teams, don't fall out of the top 8.

How to judge players:
- Value in a points league ≈ **average × games**. Games in the playoff
  weeks (last column) matter more as the season goes on.
- Early season (few games played): trust **projected** and **last season**
  more than the tiny season sample. Later: season, L15 and L30.
- Rank columns are league-wide among rostered players: projected rank 1–15
  ≈ stars, 16–60 ≈ solid starters, beyond that depth.

Diagnosis — pick the flags the data supports (none is fine):

| Flag | When |
| --- | --- |
| `no-star` | no player in the projected top 15 |
| `thin-middle` | stars, then a big drop to depth |
| `too-much-depth` | many similar low-value players, roster spots wasted |
| `inactive` | far fewer adds/drops than the rest of the league |
| `tough-schedule` | few games this week or in the playoff weeks vs. the league |
| `injuries` | key players OUT or DAY_TO_DAY |
| `playoff-push` | near or below the playoff line — needs help now |
| `contender` | top team — build for the playoff weeks |

Trade ideas — up to **3** per team, best first:
- 1–3 players per side. Only players on the two rosters.
- **Realistic.** The partner must clearly gain something too: a position they
  lack, more playoff games, a star for depth (consolidation), or depth for a
  star when they are thin. A trade the other owner would laugh at is useless.
- Fix the diagnosis: no star → consolidate 2-for-1; thin middle → split a
  star; tough playoff schedule → swap for players with more playoff games.
- Spread the ideas: don't send the same star to many teams.
- Good teams get ideas too — small upgrades for the playoff weeks.

Every trade carries one or more **angles** (shown as chips on the card):

| Angle | When |
| --- | --- |
| `sell-high` | you give a player scoring far above his projection |
| `buy-low` | you get a player scoring far below his projection |
| `consolidation` | two or three for one better player |
| `depth` | one for two — fills holes or empty roster spots |
| `positional-need` | fixes a missing position |
| `playoff-schedule` | more games in the playoff weeks |
| `injury-cover` | replaces players who are OUT |

**Say "sell high" and "buy low" in so many words** — the league uses those
terms. If a trade has `sell-high` or `buy-low`, its `whyForYou` must contain
"sell high" / "buy low" (or "selling high" / "buying low"); if the text says
it, the angle must be there. The check enforces both ways.

## 3. Write the draft

`trades/draft.json`:

```json
{
  "week": 2,
  "teams": [
    {
      "owner": "Dor Barda",
      "diagnosis": { "summary": "…", "flags": ["no-star", "injuries"] },
      "trades": [
        {
          "partnerOwner": "Barak Miller",
          "give": [4065648, 4433134],
          "get": [3155942],
          "angles": ["sell-high", "consolidation"],
          "whyForYou": "Sell high on … ",
          "whyTheyAccept": "…"
        }
      ]
    }
  ]
}
```

- Every team once. `owner` / `partnerOwner` exactly as in the digest. Players
  by **id** — the check fills in names and every stat on the cards.
- Summary up to 700 characters, each "why" up to 400. Write to the owner
  ("you"), direct and a bit fun, but useful first. Player and team names as in
  the digest.
- **Never invent a number.** Quote only numbers that appear in the digest for
  this team, its trade partners, or the league header (round the way the
  digest shows them). No sums, differences or percentages you computed —
  the check rejects any number it can't find.

## 4. Check, save, publish

```bash
npx tsx .claude/skills/trade-suggestions/validate.mts trades/input.json trades/draft.json
```

Fix every ❌ and run again. Read the ⚠️ warnings: "may say no" means
rethink that trade unless you have a real reason. When clean:

```bash
npx tsx .claude/skills/trade-suggestions/validate.mts trades/input.json trades/draft.json --write
git add data/trades
git commit -m "chore: trade suggestions week NN"
git pull --rebase origin main
git push origin HEAD:main
```

Vercel redeploys in ~1 minute. `trades/` is git-ignored — never commit it.
**Never commit owner passcodes.**

Finish with one line per team: owner, flags, and the first trade idea.
