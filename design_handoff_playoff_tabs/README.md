# Handoff: Playoff page — Teams Bets & Analytics tabs (V2)

## Overview

Two redesigned tabs for the **NBA Playoffs page** in FantasyHQ — a private bracket-betting pool between 9 friends. Both designs use the "V2" direction that was selected during design review.

- **Teams Bets tab** — series-by-series head-to-head cards. Shows the matchup, a live vote bar (% of pool on each team), and friend avatars + score badges grouped under whichever team they picked.
- **Analytics tab** — editorial / magazine layout. Big leader callout, dark-themed cumulative-points trajectory chart, "Upset of the round" feature panel, consensus meters for active series, last-8 form strip, and a most-loved/least-loved heatmap.

## About the Design Files

The HTML files in this bundle are **design references**, not production code. They are React-on-Babel prototypes intended to communicate look-and-feel, layout, hierarchy, and interaction logic.

The implementation task is to **recreate these designs inside the existing FantasyHQ Next.js codebase** (`dorbarda/FantasyHQ`, branch `claude/fantasy-hq-mvp-ScUru`) using its established patterns:

- Next.js App Router (`app/nba-playoffs/page.tsx`)
- TailwindCSS with the custom CSS-variable theme defined in `app/globals.css` and `tailwind.config.ts`
- The existing `PlayoffTabNav` component (do not re-create the tab strip — it already exists)
- Existing data loaders (`data/playoff-bets.json`, `data/playoff-results.json`) and the `computeAllScores` helper in `lib/playoff-scoring.ts`
- Recharts (already a dependency) for charts where useful

The currently-shipping `BetsTab()` and `AnalyticsTab()` functions in `app/nba-playoffs/page.tsx` should be **replaced** with implementations matching these designs.

## Fidelity

**High-fidelity.** Colors, typography, spacing, hierarchy, and component structure should be reproduced as designed. Rebuild using the existing Tailwind tokens (`bg-surface`, `text-foreground`, etc.) and the hex values listed below — they are already what `globals.css` exposes.

## Files in this bundle

| File | Purpose |
|---|---|
| `Teams Bets V2.html` | Open in a browser to see the live Team Bets design |
| `Analytics V2.html` | Open in a browser to see the live Analytics design |
| `team-bets-v2.jsx` | Source for Teams Bets — read this for exact layout/JSX structure |
| `analytics-v2.jsx` | Source for Analytics — read this for exact layout/JSX structure |
| `primitives.jsx` | Shared `Avatar`, `TeamMark`, `Streak`, `SectionTitle`, etc. |
| `data.js` | Mock dataset used by the prototype + helper functions (`scoreFor`, `streakFor`, `pickDistribution`, `teamBetSummary`) — these correspond to logic that should live in `lib/playoff-scoring.ts` |

---

## Tab 1 — Teams Bets (V2 "Series H2H Cards")

### Purpose
Replaces the existing wide owner × series matrix table. Members of the pool can scan series-by-series and see at a glance:
- Who picked which team
- The exact series score each person called
- Whether the call has resolved (correct / exact / wrong) or is still live
- Aggregate consensus via the central vote bar

### Layout

Single-column page inside the existing playoff layout:

```
[ tab nav (existing PlayoffTabNav) ]
[ round section header — "Round 2 · Conference Semifinals · 4 active series" ]
[ 2-column grid of H2H series cards ]
[ round section header — "Round 1 · First Round · 8 settled" ]
[ 2-column grid of H2H series cards ]
```

- Page background: `var(--background)` = `#F8FAFC`
- Page padding: `24px`
- Grid gap between cards: `16px`
- On screens narrower than ~720px, collapse the 2-column grid to a single column.

### Round section header

```
[uppercase kicker] [bold title] [muted count] ─── divider ───
```

- Kicker: 11px, weight 800, letter-spacing 0.16em, uppercase, color `#94A3B8`
- Title: 16px, weight 800, color `#0F172A`
- Count: 12px, color `#94A3B8`, prefixed with `· `
- Divider: `flex: 1; height: 1px; background: #E2E8F0` — fills remaining row width
- Margin-bottom: `12px`; section margin-bottom: `28px`

### Series H2H Card

A single card represents one series. Structure (top → bottom):

1. **Status bar** — pale background strip
   - Padding `10px 16px`, background `#F8FAFC`, bottom border `1px solid #E2E8F0`
   - Left: series label (e.g. "East Semis 1") — 11px / 800 / uppercase / 0.12em tracking / `#94A3B8`
   - Right: result OR live indicator
     - Settled: green `✓ {ABBR} in {score}` — 11px / 700 / `#10B981`
     - Active: amber dot (`6×6px`, `#F59E0B`) + `LIVE` text 11px / 700 / `#92400E` / 0.05em tracking

2. **Matchup head** — padding `16px 16px 12px`
   - Two team blocks left/right separated by a centered "vs" label (11px / 700 / `#94A3B8`)
   - Each team block: `TeamMark` (36px disc) + team name (last word, 13px / 800 / `#0F172A`) + backer count (10px / `#94A3B8`)
   - Left block left-aligned, right block right-aligned and reversed (logo on outside)
   - **Vote bar row** below — three-up flexbox:
     - Left: `{pctA}%` (12px / 800 / team A primary color, 36px-wide right-aligned, `tabular-nums`)
     - Middle: 10px-tall bar, `border-radius: 999px`, background `#F1F5F9`
       - Inner segments: team A primary color sized to `pctA%`, team B primary color sized to `pctB%`
       - When the series is settled, the **losing** side's segment gets `opacity: 0.4`
     - Right: `{pctB}%` (mirror of left)

3. **Backer columns** — flex row, top border `1px solid #F1F5F9`
   - Two equal-flex columns split by a `1px solid #E2E8F0` vertical divider
   - Left column background: `rgba(248,250,252,0.6)`, right column background: `rgba(241,245,249,0.5)`
   - Each column has a `3px solid {team primary}` top border
   - Padding `14px 16px`, internal `gap: 6px`
   - Each backer row:
     - `Avatar` (26px, owner color) + first name (12px / 600 / `#0F172A`) + score pill (right-aligned)
     - Score pill: 11px / 700, padding `2px 8px`, radius `6px`, `tabular-nums`
       - **Exact** (winner correct AND `pickScore === score`): bg `#FEF9C3`, color `#713F12`, border `1px solid #EAB308`, append `★` after score
       - **Correct winner**: bg `#DCFCE7`, color `#14532D`
       - **Wrong (settled)**: bg `#FEE2E2`, color `#7F1D1D`
       - **Pending (no winner yet)**: bg `#FFFFFF`, color `#475569`, border `1px solid #E2E8F0`

### Card styling

- Outer: `background #FFFFFF`, `border 1px solid #E2E8F0`, `border-radius 14px`, `overflow hidden`, `display flex; flex-direction column`

---

## Tab 2 — Analytics (V2 "Editorial Recap")

### Purpose
Replaces the existing per-series accordion of pie charts. Shifts from "stats per series" to "story of the pool." Six panels, top to bottom.

### Layout

```
[ tab nav ]
[ Editorial header — leader + 3 big stats (4-col grid) ]                ← height ~160px
[ Trajectory (dark) | Form strip (light) ]    1.4fr / 1fr               ← gap 16px
[ Upset of the round (cream) | Consensus meters (white) ] 1fr / 1fr     ← gap 16px
[ Picks heatmap — Most loved | Least loved (2-col within one card) ]
```

- Page background `#F8FAFC`, padding `24px`
- Vertical gap between panels: `18px`
- Mobile: stack all rows vertically. The trajectory chart can keep aspect ratio via `viewBox`.

### Panel 1 — Editorial header

White card, `border 1px solid #E2E8F0`, `border-radius 16px`, padding `28px`. Inside is a **4-column CSS grid** with column ratios `1.4fr 1fr 1fr 1fr`, gap `32px`, `align-items: end`.

- **Column 1 — Pool leader**
  - Kicker "POOL LEADER" — 10px / 800 / 0.18em tracking / `#94A3B8`
  - 56px `Avatar` (owner color) + name (32px / 900 / `-0.03em` letter-spacing / `#0F172A`)
  - Sub: "+{lead} pts ahead of {runnerUp first name}" — 13px / `#64748B`
- **Columns 2–4 — Big stats** (all use `BigStat` component)
  - Each: tiny kicker (10px / 800 / 0.18em / `#94A3B8`), then 56px / 900 / `-0.04em` tracking value, then 12px / `#64748B` sub
  - Column 2: "POINTS" — `{leader.total}`, sub "Total accumulated", color = leader's owner color
  - Column 3: "ACCURACY" — `{groupAcc}%`, sub "{correct} of {total} picks correct group-wide", color `#0F172A`
  - Column 4: "EXACTS" — `{totalExact}`, sub "Series scores called perfectly", color `#EAB308`

### Panel 2 — Trajectory chart (dark)

`background #0F172A`, `border-radius 16px`, padding `24px`, color `#fff`.

Header: kicker "TRAJECTORY" (10px / 800 / 0.18em / `#94A3B8`) and title "The race so far" (22px / 800 / `-0.02em`). Right-aligned subtitle "Cumulative pts · Round 1" (11px / `#94A3B8`).

`<svg viewBox="0 0 520 200">`:
- 5 horizontal grid lines at t∈{0, 0.25, 0.5, 0.75, 1}, stroke `rgba(255,255,255,0.08)`
- One polyline per owner using their owner color, `stroke-width 2`, opacity 0.9
- Endpoint dot: 3.5px-radius circle in owner color
- X axis: equally spaced steps, one per completed series; Y axis: cumulative points (scoring rules: correct +2, exact +2 bonus, "4-3 close" +1)

Legend (below chart, sorted by current points desc): pill chips
- `padding: 3px 10px 3px 3px`, `background rgba(255,255,255,0.06)`, `border 1px solid rgba(255,255,255,0.08)`, `border-radius 999px`
- 20px Avatar + first name (11px / 600) + total points in owner color (11px / 800)

### Panel 3 — Form strip (last 8 picks)

White card, `border 1px solid #E2E8F0`, radius 16, padding 22.

For each owner row (sorted by total points desc):
- 24px Avatar — full name (12px / 600 / `#0F172A`) — `Streak` component (last 8 picks) — total points right-aligned (13px / 800, `tabular-nums`, 38px-wide)

`Streak` renders a row of `8×14px` colored bars with `border-radius 2px`, `gap 3px`:
- Exact: `#EAB308`
- Correct: `#10B981`
- Wrong: `#EF4444`
- No pick: `#E2E8F0`

Footer legend separated by a top border `1px solid #F1F5F9`, padding-top 10, gap 10. Three swatches (`8×12px`) with 10px / `#64748B` labels.

### Panel 4 — Upset of the round (cream feature)

`background #FEF3C7`, `border 1px solid #FDE68A`, `border-radius 16px`, padding 24.

- Kicker "UPSET OF THE ROUND" — 10px / 800 / 0.18em / `#92400E`
- Headline (28px / 900 / `-0.025em` / `#0F172A`, 1.05 line-height): two lines, e.g. "Wolves over Nuggets, in six."
- Mid row: 48px winner mark — "over" (22px / 800 / `#94A3B8`) — 48px loser mark — series score auto-pushed to right (24px / 900 / `-0.02em`)
- Body paragraph 13px / `#0F172A` / line-height 1.5, `text-wrap: pretty`
- Callout box: padding `10px 12px`, `background rgba(255,255,255,0.5)`, `border-radius 10px`, `border 1px solid rgba(146,64,14,0.15)`. Emoji + 12px / 600 / `#92400E` text with bold count "**0 of 9** friends called it…"

The displayed upset is the most lopsided wrong call (sourced dynamically from series where the lower-seed team won and few/no friends picked them).

### Panel 5 — Consensus meters (active series)

White card, radius 16, padding 22.

For each active (Round 2) series:
- Top row: series label left (11px / 600 / `#94A3B8`), pick count right (11px / `#94A3B8`)
- Mid row: 28px team mark of the favored team — `{team} favored` (13px / 700, "favored" muted) over a `8px` progress bar — big % on right (18px / 900 / `-0.02em`, in team primary color)

### Panel 6 — Picks heatmap

White card, radius 16, padding 22. Inside, a 2-column grid with `gap 24px`:

- Left column "Most loved" / "Bracket favorites" — top 5 most-picked teams
- Right column "Least loved" / "Lonely calls" — bottom 5 (reversed)

Each row: 24px team mark — team last-word name (13px / 700) — `80×5px` progress bar (filled in team primary color, scaled vs the global max picks) — pick count (13px / 800, `tabular-nums`, 24px-wide right-aligned). Rows separated by `border-bottom 1px solid #F1F5F9`, padding `8px 0`.

---

## Shared primitives (see `primitives.jsx`)

### `Avatar`

Circular, owner-colored disc with up-to-2-letter initials.

```ts
<Avatar name="Dor Barda" size={24} color="#0EA5E9" />
```

- Background = owner color, color `#fff`
- Font: `size * 0.4`, weight 700, letter-spacing 0.02em
- `flex-shrink: 0`

### `TeamMark`

Disc showing a team's 3-letter abbreviation, colored with the team's primary color and bordered with the secondary color.

```ts
<TeamMark team="Oklahoma City Thunder" size={32} />
```

- Background = team primary, border `2px solid {team secondary}`, color `#fff`
- Font: `size * 0.32`, weight 800

### `Streak`

Row of small bars representing a recent-picks streak. See Panel 3 above.

---

## Design tokens (already in globals.css)

| Token | Value | Use |
|---|---|---|
| `--background` | `#F8FAFC` | Page bg |
| `--surface` | `#FFFFFF` | Card bg |
| `--surface-secondary` | `#F1F5F9` | Subtle bg, bar tracks |
| `--border` | `#E2E8F0` | Card borders, dividers |
| `--foreground` | `#0F172A` | Body text |
| `--foreground-secondary` | `#475569` | Mid grey text |
| `--foreground-muted` | `#94A3B8` | Kickers, captions |
| `--accent` | `#C8956C` | (Not heavily used in V2) |
| `--green` | `#10B981` | Correct status |
| `--red` | `#EF4444` | Wrong status |
| `--orange` | `#F59E0B` | Live / pending |
| `--blue` | `#3B82F6` | Tertiary |

### Status pill specifics

| Status | bg | border | color |
|---|---|---|---|
| Exact | `#FEF9C3` | `1px solid #EAB308` | `#713F12` |
| Correct | `#DCFCE7` | none | `#14532D` |
| Wrong (close 4-3) | `#FEF3C7` | none | `#92400E` |
| Wrong | `#FEE2E2` | none | `#7F1D1D` |
| Pending | `#FFFFFF` | `1px solid #E2E8F0` | `#475569` |

### Owner colors

These are the prototype's owner colors. If the codebase already has owner colors, prefer those. Otherwise:

| Owner | Hex |
|---|---|
| Yuval Halevy | `#EF4444` |
| Barak Miller | `#3B82F6` |
| Dor Gelless | `#10B981` |
| Ilay Mendel | `#8B5CF6` |
| Yoav Coracos | `#F59E0B` |
| Dor Barda | `#0EA5E9` |
| Omer Rosenberg | `#EC4899` |
| Yotam Goldin | `#14B8A6` |
| Amir Ben Izhak | `#A855F7` |

### Team colors

A 20-team color map (primary + secondary, plus 3-letter abbr) is in `data.js` under `TEAMS`. Lift this into a server-side constants file (e.g. `lib/team-meta.ts`) so it can be shared by future features (bracket, leaderboard, etc.).

---

## State management & data

These tabs are **server components** in the existing `app/nba-playoffs/page.tsx` — no client state is needed for the core view. Data is computed server-side from `playoff-bets.json` + `playoff-results.json`.

Helpers to add to `lib/playoff-scoring.ts` (or use the existing equivalents — see prototype's `data.js`):

- `pickDistribution(seriesId)` → `{ teamName: count }` for a given series.
- `cumulativePointsTrajectory(ownerName)` → `number[]` with cumulative points after each completed series (for Trajectory chart).
- `streakSequence(ownerName, max=8)` → `("exact" | "correct" | "wrong" | null)[]` of recent picks.
- `topUpset()` → the most lopsided upset (lower seed won + few callers) with metadata.
- `mostPickedTeams(limit)` / `leastPickedTeams(limit)` for the heatmap.

The existing `computeAllScores` already returns the totals/correct/exact you need for the leader card and headline stats.

## Interactions & behavior

The V2 designs are largely **read-only / dashboard** style.

- **Hover states (subtle):**
  - On a series card: `box-shadow 0 1px 2px rgba(15,23,42,0.04)` → `0 8px 24px rgba(15,23,42,0.06)`, `transition 150ms ease`.
  - On an avatar in the trajectory legend or backer list: subtle ring (`box-shadow 0 0 0 2px {ownerColor}`).
- **Tooltip (optional, nice-to-have):** hovering a polyline endpoint in the trajectory chart shows that owner's last-completed series and resulting points delta.
- **Responsive:**
  - <720px: all 2-column grids collapse to 1 column. The editorial header's 4-col grid becomes a 2×2 grid. Trajectory chart keeps `viewBox` and shrinks proportionally.
  - The dark trajectory background should retain enough contrast — keep the `#0F172A` fill.

## Assets

No raster assets. Team marks are CSS discs with text abbreviations — replace with proper team logos later if available (drop them into `public/teams/{ABBR}.svg` and swap `TeamMark`'s text for an `<img>`).

## Acceptance checks

- [ ] `BetsTab()` in `app/nba-playoffs/page.tsx` is replaced with the H2H card grid.
- [ ] `AnalyticsTab()` in `app/nba-playoffs/page.tsx` is replaced with the editorial layout.
- [ ] Tab nav (`PlayoffTabNav`) is unchanged.
- [ ] Status pill colors match the table above exactly.
- [ ] Owner & team colors come from a shared module, not inlined per-component.
- [ ] No console errors; lighthouse pass on the playoff page.
- [ ] Mobile: no horizontal scroll, all panels readable.
