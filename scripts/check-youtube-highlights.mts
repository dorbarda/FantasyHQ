/**
 * Fantasy HQ — YouTube highlights check
 * Run with: SEASON=2026 npx tsx scripts/check-youtube-highlights.mts 2026-04-08 2026-04-10
 *
 * Runs the real two-step recap pipeline on past days and prints what it
 * would store — no waiting for the new season, nothing written:
 *   1. top fantasy games on our rosters that day (ESPN)
 *   2. a video for each from the official NBA YouTube channel
 *
 * Point SEASON at a season that has those days (2026 = the 2025-26 season).
 * Needs ESPN_S2, SWID, LEAGUE_ID and YOUTUBE_API_KEY. Dates within 30 days
 * page the uploads list (~1 quota unit per 50 videos); older dates use search
 * instead, 2 searches per performer at 100 units each (~2,000 for the default
 * 10 performers, of the free 10,000 a day).
 */
const missing = ['ESPN_S2', 'SWID', 'LEAGUE_ID', 'YOUTUBE_API_KEY'].filter(k => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing: ${missing.join(', ')}`);
  process.exit(1);
}

const dates = process.argv.slice(2).flatMap(a => a.split(',')).map(d => d.trim()).filter(Boolean).sort();
if (dates.length === 0) {
  console.error('Usage: SEASON=2026 npx tsx scripts/check-youtube-highlights.mts YYYY-MM-DD [...]');
  process.exit(1);
}

// Import after env is in place — the ESPN client reads it at load.
const { getTopPerformers } = await import('../lib/espn');
const { getScheduleSeason, buildDateIndex, PRO_TEAM_ABBREV } = await import('../lib/espn-schedule');
const { getNbaUploadsSince, searchNbaChannel, filterPlayableHere, pickClips, isFullGameHighlights, TEAM_NICKNAME } = await import('../lib/youtube');
const { CURRENT_SEASON_LABEL } = await import('../lib/season');

console.log(`Season ${CURRENT_SEASON_LABEL} · dates ${dates.join(', ')}\n`);

// Step 1 — who
const schedule = await getScheduleSeason();
const index = buildDateIndex(schedule.schedules);
if (!index.anchor) {
  console.error('❌ Could not date the season from the ESPN schedule.');
  process.exit(1);
}
const anchorMs = Date.parse(`${index.anchor}T00:00:00Z`);
const days = dates.map(date => ({
  date,
  scoringPeriodId: Math.round((Date.parse(`${date}T00:00:00Z`) - anchorMs) / 86_400_000) + 1,
}));

const top = await getTopPerformers(days, 5);
console.log('Step 1 — top fantasy games on our rosters');
for (const p of top) {
  console.log(`   ${p.date}  ${p.playerName} (${PRO_TEAM_ABBREV[p.proTeamId] ?? '?'}) ${p.fantasyPoints} pts · ${p.ownerName}`);
}
if (top.length === 0) console.log('   none — were there games on these dates in this season?');

// Step 2 — videos. Recent dates page the uploads list like the nightly job;
// older ones search instead, since paging months back is slow and YouTube
// starts failing that deep (seen: HTTP 503 after ~30 s).
const daysBack = (Date.now() - Date.parse(`${dates[0]}T00:00:00Z`)) / 86_400_000;
let uploads: Awaited<ReturnType<typeof getNbaUploadsSince>>;
if (daysBack <= 30) {
  uploads = await getNbaUploadsSince(dates[0]);
  console.log(`\nStep 2 — NBA channel uploads since ${dates[0]}: ${uploads.length}`);
} else {
  const seen = new Map<string, (typeof uploads)[number]>();
  for (const p of top) {
    const to = new Date(Date.parse(`${p.date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    const team = TEAM_NICKNAME[PRO_TEAM_ABBREV[p.proTeamId] ?? ''] ?? '';
    for (const q of [p.playerName, `${team} full game highlights`]) {
      for (const v of await searchNbaChannel(q, p.date, to)) seen.set(v.id, v);
    }
  }
  uploads = [...seen.values()];
  console.log(`\nStep 2 — searched the NBA channel (${top.length * 2} searches): ${uploads.length} candidate videos`);
}
const playable = await filterPlayableHere(uploads.map(v => v.id));
console.log(`   full-game highlights: ${uploads.filter(v => isFullGameHighlights(v.title)).length}`);
console.log(`   playable embedded in Israel: ${playable.size} of ${uploads.length}`);

const clips = pickClips(
  top.map(p => ({ ...p, proTeam: PRO_TEAM_ABBREV[p.proTeamId] ?? '' })),
  uploads.filter(v => playable.has(v.id))
);

console.log('\nResult — what the recap would show');
for (const c of clips) {
  console.log(`   ${c.kind === 'player' ? '🎯 player clip' : '🏀 game clip  '}  ${c.performer.playerName} → ${c.video.title}`);
  console.log(`      https://www.youtube.com/watch?v=${c.video.id}`);
}
const noClip = top.filter(p => !clips.some(c => c.performer === p || c.performer.playerName === p.playerName));
for (const p of noClip) console.log(`   ✖ no video   ${p.playerName} (${p.date})`);

console.log(`\n${clips.length}/${top.length} performances got a video ` +
  `(${clips.filter(c => c.kind === 'player').length} player clips, ${clips.filter(c => c.kind === 'game').length} game clips).`);
