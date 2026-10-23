/**
 * Personal strategy agent — the page. Turns the report from build.mts into
 * one self-contained HTML file, published as a private claude.ai artifact.
 */
import {
  type AgentPlayer, type Calendar, type DayPlan, type MatchupReport, type Pickup, type TwoDayPlan,
  GAME_CV, AVERAGE_ERROR, trendOf, weekday,
} from './engine';

export interface Report {
  generatedAt: string;
  season: number;
  today: { sp: number; date: string };
  team: { id: number; name: string; owner: string };
  defenseSample: number;
  current: MatchupReport | null;
  next: MatchupReport | null;
  pickups: { today: Pickup[]; tomorrow: Pickup[]; restOfWeek: Pickup[]; nextWeek: Pickup[] };
  plan: TwoDayPlan | null;
  trending: AgentPlayer[];
  roster: AgentPlayer[];
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const n1 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const n0 = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (p: number) => `${Math.round(p * 100)}%`;
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${n1(Math.abs(n))}`;
const shortDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function renderPage(r: Report, cal: Calendar): string {
  const nba = (p: AgentPlayer) => cal.abbrev.get(p.proTeamId) ?? '';
  const israelTime = new Date(r.generatedAt).toLocaleString('en-GB', {
    timeZone: 'Asia/Jerusalem', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const move = bestMove(r);

  return `<title>Peaky Blinders War Room</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&display=swap">
<style>
/* Layout: one column, summary first — verdict, today's move, then the week grid, free agents, next week. */
:root {
  --bg: #eef1f4; --panel: #ffffff; --ink: #15212c; --muted: #5b6875; --line: #d5dce3;
  --accent: #c2410c; --accent-soft: #fde7da;
  --good: #15803d; --good-soft: #dcf2e3; --warn: #a16207; --warn-soft: #fbf0cf; --bad: #b91c1c; --bad-soft: #fbe0e0;
  --display: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  --body: 'Barlow', system-ui, -apple-system, 'Segoe UI', sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #0e141a; --panel: #17212b; --ink: #e6ecf1; --muted: #9aa8b5; --line: #2a3744;
  --accent: #fb923c; --accent-soft: #3a2416;
  --good: #4ade80; --good-soft: #15301f; --warn: #facc15; --warn-soft: #33290c; --bad: #f87171; --bad-soft: #3a1717;
  color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #0e141a; --panel: #17212b; --ink: #e6ecf1; --muted: #9aa8b5; --line: #2a3744;
  --accent: #fb923c; --accent-soft: #3a2416;
  --good: #4ade80; --good-soft: #15301f; --warn: #facc15; --warn-soft: #33290c; --bad: #f87171; --bad-soft: #3a1717;
  color-scheme: dark }
body { background: var(--bg); color: var(--ink); font: 15px/1.5 var(--body); }
.wrap { max-width: 1080px; margin: 0 auto; padding-block: 20px 48px;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));
  display: grid; gap: 20px; }
h1, h2, h3 { font-family: var(--display); margin: 0; line-height: 1.1; text-wrap: balance; }
h1 { font-size: 2.1rem; font-weight: 700; }
h2 { font-size: 1.45rem; font-weight: 600; text-transform: uppercase; letter-spacing: .03em; }
h3 { font-size: 1.1rem; font-weight: 600; }
.eyebrow { font-size: .78rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); font-weight: 600; }
.muted { color: var(--muted); }
.num, td.n, th.n { font-variant-numeric: tabular-nums; text-align: right; }
.wrap > *, .panel > *, .cols > * { min-width: 0; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 18px; display: grid; gap: 14px; min-width: 0; }
header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 8px; }
.score { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: center; }
.team { display: grid; gap: 2px; min-width: 0; }
.team.them { text-align: right; }
.team .name { font-family: var(--display); font-size: 1.25rem; font-weight: 600; overflow-wrap: anywhere; }
.big { font-family: var(--display); font-size: 2.6rem; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1; }
.chance { text-align: center; display: grid; gap: 6px; justify-items: center; }
.chance .big { font-size: 3rem; }
.pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: .78rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
.pill.favored { background: var(--good-soft); color: var(--good); }
.pill.tossup { background: var(--warn-soft); color: var(--warn); }
.pill.underdog, .pill.longshot { background: var(--bad-soft); color: var(--bad); }
.bar { height: 8px; border-radius: 4px; background: var(--bad-soft); overflow: hidden; width: 100%; max-width: 220px; }
.bar i { display: block; height: 100%; background: var(--good); }
.advice { font-size: 1.05rem; font-weight: 500; }
.move { border-left: 4px solid var(--accent); background: var(--accent-soft); border-radius: 8px; padding: 12px 14px; display: grid; gap: 4px; }
.move hr.split { border: 0; border-top: 1px solid var(--line); margin: 6px 0; width: 100%; }
.move strong { font-family: var(--display); font-size: 1.3rem; }
.scroll { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: .9rem; }
th, td { padding: 6px 8px; border-bottom: 1px solid var(--line); text-align: left; white-space: nowrap; }
th { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); font-weight: 600; }
td.wrap-cell { white-space: normal; min-width: 140px; }
.days td.empty { background: var(--good-soft); color: var(--good); font-weight: 600; }
.days td.short { color: var(--bad); font-weight: 600; }
.days th.today, .days td.today { box-shadow: inset 0 -2px 0 var(--accent); }
ul.notes { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
.cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); gap: 16px; }
.tabs { display: flex; flex-wrap: wrap; gap: 6px; }
.tabs button { font: 600 .85rem var(--body); border: 1px solid var(--line); background: var(--bg); color: var(--ink);
  padding: 6px 12px; border-radius: 999px; cursor: pointer; }
.tabs button[aria-selected="true"] { background: var(--ink); color: var(--panel); border-color: var(--ink); }
.tabs button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.tag { font-size: .7rem; font-weight: 600; padding: 1px 6px; border-radius: 4px; background: var(--bg); color: var(--muted); text-transform: uppercase; }
.tag.waiver { background: var(--warn-soft); color: var(--warn); }
.tag.stream { background: var(--accent-soft); color: var(--accent); }
.up { color: var(--good); } .down { color: var(--bad); }
.gain { font-weight: 700; color: var(--good); }
details summary { cursor: pointer; font-weight: 600; }
footer { font-size: .85rem; color: var(--muted); display: grid; gap: 6px; }
@media (max-width: 560px) { .big { font-size: 2rem; } .chance .big { font-size: 2.4rem; } h1 { font-size: 1.7rem; } }
</style>
<div class="wrap">
  <header>
    <div>
      <div class="eyebrow">${esc(r.team.owner)} · Strategy agent</div>
      <h1>${esc(r.team.name)}</h1>
    </div>
    <div class="muted">Updated ${esc(israelTime)} (Israel) · ESPN live data</div>
  </header>

  ${r.current ? matchupPanel(r.current, r, 'This week', true) : '<section class="panel"><h2>This week</h2><p>No matchup found.</p></section>'}

  ${move ? `<section class="panel"><h2>Your next moves</h2>${move}</section>` : ''}

  <section class="panel" id="free-agents">
    <div><h2>Free agents</h2>
    <p class="muted">Gain = how many more points your team is projected to score with him in and the drop out. It counts only games he'd really start for you (empty spots), against that day's opponent. ↑ soft defense, ↓ tough defense.</p></div>
    <div class="tabs" role="tablist">
      ${[['fa-today', 'Today'], ['fa-tomorrow', 'Tomorrow'], ['fa-week', 'Rest of week'], ['fa-next', 'Next week'], ['fa-trend', 'Trending']]
        .map(([id, label], i) => `<button role="tab" id="tab-${id}" aria-controls="${id}" aria-selected="${i === 0}">${label}</button>`).join('')}
    </div>
    <div id="fa-today" role="tabpanel">${pickupTable(r.pickups.today, nba, 'today')}</div>
    <div id="fa-tomorrow" role="tabpanel" hidden>${pickupTable(r.pickups.tomorrow, nba, 'tomorrow')}</div>
    <div id="fa-week" role="tabpanel" hidden>${pickupTable(r.pickups.restOfWeek, nba, 'the rest of this week')}</div>
    <div id="fa-next" role="tabpanel" hidden>${pickupTable(r.pickups.nextWeek, nba, 'next week')}</div>
    <div id="fa-trend" role="tabpanel" hidden>${trendTable(r.trending, nba)}</div>
  </section>

  ${r.next ? matchupPanel(r.next, r, 'Next week', false) : ''}

  <section class="panel">
    <h2>Your roster</h2>
    <div class="scroll"><table>
      <thead><tr><th>Player</th><th>Pos</th><th>NBA</th><th class="n">Season</th><th class="n">Last 7</th><th class="n">Last 15</th><th class="n">Proj.</th><th class="n">Used avg</th><th class="n">Games left</th><th class="n">Next wk</th><th>Status</th></tr></thead>
      <tbody>${[...r.roster].sort((a, b) => b.form - a.form).map(p => {
        const left = r.current?.me.sim.byPlayer.get(p.id)?.games ?? 0;
        const nextG = r.next?.me.sim.byPlayer.get(p.id)?.games ?? 0;
        const t = trendOf(p);
        return `<tr><td>${esc(p.name)}</td><td>${esc(p.pos)}</td><td>${esc(nba(p))}</td>
          <td class="n">${p.gp ? n1(p.seasonAvg) : '—'}</td>
          <td class="n ${t >= 5 ? 'up' : t <= -5 ? 'down' : ''}">${p.l7 ? n1(p.l7) : '—'}</td>
          <td class="n">${p.l15 ? n1(p.l15) : '—'}</td><td class="n">${n1(p.proj)}</td><td class="n"><b>${n1(p.form)}</b></td>
          <td class="n">${left}</td><td class="n">${nextG}</td>
          <td>${p.onIR ? '<span class="tag">IR</span>' : p.status !== 'ACTIVE' ? `<span class="tag waiver">${esc(p.status.replace(/_/g, ' ').toLowerCase())}</span>` : ''}</td></tr>`;
      }).join('')}</tbody>
    </table></div>
  </section>

  <footer>
    <details><summary>How the numbers are made</summary>
      <ul class="notes">
        <li><b>Used avg</b> (points per game the agent projects with): before games it's ESPN's projection. Each game played moves weight to real form (60% last 15 days + 40% season), fully from game 10.</li>
        <li><b>Projection</b>: each day, the highest averages that fit the 10 starting spots (PG, SG, SF, PF, C, G, F, 3× UTIL) start. IR and OUT players get no games. Waiver players count only from the day they clear.</li>
        <li><b>Opponent defense</b>: from the last 21 days of game logs, how much guards, forwards and centers score against each NBA team compared with their own average. Limited to ±15%. ${r.defenseSample > 0 ? `Based on ${n0(r.defenseSample)} player-games so far.` : '<b>No games played yet, so every opponent counts as average for now.</b>'}</li>
        <li><b>Win chance</b>: a player's points swing about ±${Math.round(GAME_CV * 100)}% game to game (measured on last season's ESPN logs), plus ±${Math.round(AVERAGE_ERROR * 100)}% for the average itself being off (an assumption). Points already scored are certain.</li>
        <li><b>Add limit</b>: 1 add per day (league rule).</li>
      </ul>
    </details>
  </footer>
</div>
<script>
(function () {
  var tabs = document.querySelectorAll('.tabs button');
  tabs.forEach(function (b) {
    b.addEventListener('click', function () {
      tabs.forEach(function (o) {
        var on = o === b;
        o.setAttribute('aria-selected', String(on));
        document.getElementById(o.getAttribute('aria-controls')).hidden = !on;
      });
    });
  });
})();
</script>`;
}

/** Today's and tomorrow's adds (1 per day), chosen together; next week's when this week is lost. */
function bestMove(r: Report): string | null {
  const c = r.current;
  if (c && c.verdict.key === 'longshot') {
    const pick = r.pickups.nextWeek.find(p => p.player.freeStatus === 'FREEAGENT') ?? r.pickups.nextWeek[0];
    if (!pick) return '<p>No free agent helps next week yet. Keep your add.</p>';
    return `<div class="move">${step('Best add · next week', pick, 'next week')}
      <span class="muted">This week looks lost, so the add goes to next week.</span></div>`;
  }
  const plan = r.plan;
  if (!plan) return '<p>No free agent adds points this week. Keep your adds.</p>';
  const parts = [
    plan.today
      ? step('Today', plan.today, 'this week')
      : `<span class="eyebrow">Today</span><strong>No add today</strong><span>${plan.tomorrow?.drop
        ? `Keep ${esc(plan.tomorrow.drop.name)} for his game tonight, then make tomorrow's move.`
        : 'Save the add for tomorrow.'}</span>`,
    plan.tomorrow ? step('Tomorrow', plan.tomorrow, 'this week') : '',
  ].filter(Boolean);
  return `<div class="move">${parts.join('<hr class="split">')}
    <span><b>Together: <span class="gain">${signed(plan.total)} pts</span> this week.</b></span></div>`;
}

function step(label: string, pick: Pickup, span: string): string {
  const waiver = pick.player.freeStatus === 'WAIVERS' ? ' <span class="tag waiver">on waivers, claim it</span>' : '';
  return `<span class="eyebrow">${label}</span>
    <strong>Add ${esc(pick.player.name)}${pick.drop ? `, drop ${esc(pick.drop.name)}` : ''}</strong>${waiver}
    <span><span class="gain">${signed(pick.gain)} pts</span> ${span} · ${pick.games} game${pick.games === 1 ? '' : 's'} in your empty spots (${esc(pick.opponents.join(', '))}).</span>
    ${pick.stream ? '<span class="muted">A stream: lower average than the player you drop.</span>' : ''}`;
}

function matchupPanel(m: MatchupReport, r: Report, title: string, live: boolean): string {
  const days = m.days;
  const todaySp = r.today.sp;
  const scoreRow = live && (m.me.actual > 0 || m.opp.actual > 0)
    ? `<span class="muted">Now ${n1(m.me.actual)} – ${n1(m.opp.actual)}</span>` : '';
  return `<section class="panel">
    <div class="eyebrow">${title} · Week ${m.week} · ${days.length ? `${shortDate(cal(m, 0))} → ${shortDate(cal(m, days.length - 1))}` : ''}${live ? ` · ${days.length} day${days.length === 1 ? '' : 's'} left` : ''}</div>
    <div class="score">
      <div class="team"><span class="name">${esc(m.me.teamName)}</span><span class="big">${n0(m.me.final)}</span><span class="muted">projected · ${m.me.sim.games} games left</span></div>
      <div class="chance"><span class="eyebrow">Win chance</span><span class="big">${pct(m.winChance)}</span>
        <div class="bar" aria-hidden="true"><i style="width:${Math.round(m.winChance * 100)}%"></i></div>
        <span class="pill ${m.verdict.key}">${m.verdict.label}</span></div>
      <div class="team them"><span class="name">${esc(m.opp.teamName)}</span><span class="big">${n0(m.opp.final)}</span><span class="muted">${esc(m.opp.owner)} · ${m.opp.sim.games} games left</span></div>
    </div>
    ${scoreRow}
    <p class="advice">${esc(m.verdict.advice)}</p>
    <div class="scroll">${dayGrid(m.me.sim.days, m.opp.sim.days, todaySp, live)}</div>
    ${m.notes.length ? `<div><h3>Where you're short</h3><ul class="notes">${m.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
    <div class="cols">
      ${keyPlayers('Your top players', m.me.players, m.me.sim)}
      ${keyPlayers('Their top players', m.opp.players, m.opp.sim)}
    </div>
  </section>`;
}

function cal(m: MatchupReport, i: number): string {
  return m.me.sim.days[i]?.date ?? '';
}

function dayGrid(mine: DayPlan[], theirs: DayPlan[], todaySp: number, live: boolean): string {
  const cls = (d: DayPlan) => live && d.sp === todaySp ? 'today' : '';
  const head = mine.map(d => `<th class="n ${cls(d)}">${weekday(d.date)}<br><span class="muted">${shortDate(d.date)}</span></th>`).join('');
  const row = (label: string, ds: DayPlan[], f: (d: DayPlan, i: number) => string) =>
    `<tr><th>${label}</th>${ds.map(f).join('')}`;
  return `<table class="days">
    <thead><tr><th></th>${head}<th class="n">Total</th></tr></thead>
    <tbody>
      ${row('You: games', mine, (d, i) => {
        const gap = d.starters.length - (theirs[i]?.starters.length ?? 0);
        return `<td class="n ${cls(d)} ${gap < 0 ? 'short' : ''}">${d.starters.length}</td>`;
      })}<td class="n"><b>${sum(mine, d => d.starters.length)}</b></td></tr>
      ${row('You: empty spots', mine, d =>
        `<td class="n ${cls(d)} ${d.emptySlots.length ? 'empty' : ''}" title="${esc(d.emptySlots.join(', '))}">${d.emptySlots.length || '·'}</td>`)}<td class="n">${sum(mine, d => d.emptySlots.length)}</td></tr>
      ${row('You: points', mine, d => `<td class="n ${cls(d)}">${n0(d.points)}</td>`)}<td class="n"><b>${n0(sum(mine, d => d.points))}</b></td></tr>
      ${row('Them: games', theirs, d => `<td class="n ${cls(d)}">${d.starters.length}</td>`)}<td class="n"><b>${sum(theirs, d => d.starters.length)}</b></td></tr>
      ${row('Them: points', theirs, d => `<td class="n ${cls(d)}">${n0(d.points)}</td>`)}<td class="n"><b>${n0(sum(theirs, d => d.points))}</b></td></tr>
    </tbody></table>
    <p class="muted" style="margin:6px 0 0">Green = empty starting spots: a free agent who plays that day scores there.${live ? ' Today is underlined. Totals count games still to play.' : ''}</p>`;
}

function keyPlayers(title: string, players: AgentPlayer[], sim: MatchupReport['me']['sim']): string {
  const top = players.filter(p => !p.onIR).sort((a, b) => b.form - a.form).slice(0, 5);
  return `<div><h3>${title}</h3><div class="scroll"><table>
    <thead><tr><th>Player</th><th class="n">Avg</th><th class="n">Games</th><th class="n">Proj. pts</th></tr></thead>
    <tbody>${top.map(p => {
      const s = sim.byPlayer.get(p.id);
      return `<tr><td>${esc(p.name)}${p.status !== 'ACTIVE' ? ` <span class="tag waiver">${esc(p.status.replace(/_/g, ' ').toLowerCase())}</span>` : ''}</td>
        <td class="n">${n1(p.form)}</td><td class="n">${s?.games ?? 0}</td><td class="n">${n0(s?.points ?? 0)}</td></tr>`;
    }).join('')}</tbody></table></div></div>`;
}

function pickupTable(list: Pickup[], nba: (p: AgentPlayer) => string, span: string): string {
  if (list.length === 0) return `<p class="muted">No free agent adds points for ${esc(span)} — every spot is already covered or nobody useful plays.</p>`;
  return `<div class="scroll"><table>
    <thead><tr><th>Add</th><th>Pos</th><th>NBA</th><th class="n">Gain</th><th class="n">Games</th><th>Opponents</th><th class="n">Used avg</th><th class="n">Last 7</th><th class="n">Season</th><th>Drop</th><th class="n">Owned</th></tr></thead>
    <tbody>${list.map(p => {
      const a = p.player;
      return `<tr>
        <td>${esc(a.name)} ${a.freeStatus === 'WAIVERS' ? '<span class="tag waiver">waivers</span>' : ''}${p.stream ? ' <span class="tag stream">stream</span>' : ''}</td>
        <td>${esc(a.pos)}</td><td>${esc(nba(a))}</td>
        <td class="n gain">${signed(p.gain)}</td><td class="n">${p.games}</td>
        <td class="wrap-cell">${esc(p.opponents.join(', '))}</td>
        <td class="n"><b>${n1(a.form)}</b></td><td class="n">${a.l7 ? n1(a.l7) : '—'}</td><td class="n">${a.gp ? n1(a.seasonAvg) : '—'}</td>
        <td>${p.drop ? esc(p.drop.name) : ''}</td>
        <td class="n">${n1(a.owned)}%</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

function trendTable(list: AgentPlayer[], nba: (p: AgentPlayer) => string): string {
  if (list.length === 0) return '<p class="muted">Nobody is trending yet.</p>';
  return `<div class="scroll"><table>
    <thead><tr><th>Player</th><th>Pos</th><th>NBA</th><th class="n">Last 7</th><th class="n">Season / proj.</th><th class="n">Trend</th><th class="n">Owned</th><th class="n">Owned 7-day change</th></tr></thead>
    <tbody>${list.map(p => {
      const t = trendOf(p);
      return `<tr><td>${esc(p.name)} ${p.freeStatus === 'WAIVERS' ? '<span class="tag waiver">waivers</span>' : ''}</td><td>${esc(p.pos)}</td><td>${esc(nba(p))}</td>
        <td class="n">${p.l7 ? n1(p.l7) : '—'}</td><td class="n">${n1(p.gp >= 5 ? p.seasonAvg : p.proj || p.seasonAvg)}</td>
        <td class="n ${t > 0 ? 'up' : t < 0 ? 'down' : ''}">${p.l7 ? signed(t) : '—'}</td>
        <td class="n">${n1(p.owned)}%</td><td class="n ${p.ownedChange > 0 ? 'up' : p.ownedChange < 0 ? 'down' : ''}">${signed(p.ownedChange)}</td></tr>`;
    }).join('')}</tbody></table></div>
    <p class="muted" style="margin:6px 0 0">Owned = share of all ESPN leagues that roster him; the change shows who people are adding right now.</p>`;
}

function sum<T>(xs: T[], f: (x: T) => number): number {
  return xs.reduce((n, x) => n + f(x), 0);
}
