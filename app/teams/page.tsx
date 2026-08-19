import { hasEspnCredentials } from '@/lib/espn';
import { getAllRecords } from '@/lib/espn-records';
import { getAllHistoricalSeasons } from '@/lib/espn-history';
import { ownerToSlug, bestLogoForOwner } from '@/lib/team-utils';
import Link from 'next/link';
import Image from 'next/image';

export const revalidate = 3600;

export default async function TeamsPage() {
  if (!hasEspnCredentials()) {
    return (
      <div className="min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-[28px] font-black tracking-tight text-foreground mb-2">Teams</h1>
        <p className="text-[14px] text-secondary">ESPN credentials required.</p>
      </div>
    );
  }

  const [records, seasons] = await Promise.all([
    getAllRecords(),
    getAllHistoricalSeasons(),
  ]);

  // Build team cards from hall of fame (one entry per owner, sorted by championships → win%)
  const teams = records.hallOfFame.map(career => {
    const logo = bestLogoForOwner(career.ownerName, seasons);

    // Most recent team name this owner used
    const latestSeason = seasons.find(s =>
      s.finalStandings.some(t => t.ownerName === career.ownerName)
    );
    const latestTeamName = latestSeason?.finalStandings
      .find(t => t.ownerName === career.ownerName)?.teamName ?? '';

    // Collect all unique team names (newest first)
    const allTeamNames = seasons
      .flatMap(s => s.finalStandings.filter(t => t.ownerName === career.ownerName).map(t => t.teamName))
      .filter((name, i, arr) => arr.indexOf(name) === i);

    const lastPlaceCount = seasons.filter(s => s.lastPlace?.ownerName === career.ownerName).length;

    return {
      ...career,
      logo,
      latestTeamName,
      allTeamNames,
      lastPlaceCount,
      slug: ownerToSlug(career.ownerName),
    };
  });

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="type-page-title text-foreground">Teams</h1>
          <p className="type-page-subtitle mt-1">
            {teams.length} franchises · select a team to view their profile
          </p>
        </div>
        <Link
          href="/teams/export"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[12px] font-semibold text-secondary hover:text-accent border border-border hover:border-accent/50 bg-surface rounded-lg px-3 py-2 transition-colors shrink-0"
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
            <path d="M8 2v8m0 0L5 7m3 3 3-3M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Export PDF
        </Link>
      </div>

      {/* Team grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {teams.map(team => (
          <Link
            key={team.slug}
            href={`/teams/${team.slug}`}
            className="group bg-surface border border-border rounded-2xl p-5 flex flex-col items-center text-center hover:border-accent/60 hover:shadow-md transition-all duration-200"
          >
            {/* Logo */}
            <div className="w-20 h-20 rounded-full overflow-hidden bg-surface-secondary ring-2 ring-border group-hover:ring-accent/40 transition-all mb-3 shrink-0">
              {team.logo ? (
                <Image
                  src={team.logo}
                  alt={team.latestTeamName}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-black text-muted">
                  {team.ownerName.slice(0, 1)}
                </div>
              )}
            </div>

            {/* Owner name */}
            <p className="text-[14px] font-bold text-foreground leading-tight mb-0.5">
              {team.ownerName}
            </p>
            {/* Latest team name */}
            <p className="text-[11px] text-tertiary truncate w-full mb-3">
              {team.latestTeamName}
            </p>

            {/* Quick stats row */}
            <div className="w-full grid grid-cols-3 gap-1 border-t border-surface-secondary pt-3">
              <div className="flex flex-col items-center">
                <span className="text-[15px] font-black text-accent">
                  {team.championships > 0 ? '🏆'.repeat(Math.min(team.championships, 3)) : '—'}
                </span>
                <span className="text-[9px] text-muted uppercase tracking-wide mt-0.5">Titles</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[14px] font-black text-foreground">{team.winPct}%</span>
                <span className="text-[9px] text-muted uppercase tracking-wide mt-0.5">Win%</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[14px] font-black text-foreground">{team.seasonsPlayed}</span>
                <span className="text-[9px] text-muted uppercase tracking-wide mt-0.5">Seasons</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
