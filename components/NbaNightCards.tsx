import NbaLogo from '@/components/NbaLogo';
import { gameTopScorer, israelDay, israelTime, type ScoreboardGame, type ScoreboardTeam } from '@/lib/nba-scoreboard';

/**
 * Home: last night's NBA results and the next game day, tip-offs in Israel
 * time. Data: ESPN's public scoreboard (lib/nba-scoreboard.ts).
 */

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-border">
        <p className="type-section-label">{title}</p>
      </div>
      {children}
      {note && <p className="px-4 sm:px-5 py-2 text-[11px] text-muted border-t border-border">{note}</p>}
    </section>
  );
}

function TeamScore({ t, done }: { t: ScoreboardTeam; done: boolean }) {
  const strong = !done || t.winner;
  return (
    <div className="flex items-center justify-between gap-2">
      <p className={`flex items-center gap-2 text-[14px] font-semibold ${strong ? 'text-foreground' : 'text-secondary'}`}>
        <NbaLogo team={t.abbrev} size={22} />
        {t.abbrev}
        {t.record && <span className="text-[11px] font-medium text-muted ml-1.5">{t.record}</span>}
      </p>
      <p className={`text-[16px] tabular-nums ${strong ? 'font-bold text-foreground' : 'font-semibold text-secondary'}`}>
        {t.score ?? '—'}
      </p>
    </div>
  );
}

export function LastNightNba({ games, dateLabel }: { games: ScoreboardGame[]; dateLabel: string }) {
  return (
    <Card title={`NBA last night · ${dateLabel}`}>
      {games.length === 0 ? (
        <p className="px-5 py-6 text-[12px] text-secondary text-center">No NBA games last night</p>
      ) : (
        <ul>
          {games.map(g => {
            const top = gameTopScorer(g);
            const done = g.state === 'post';
            return (
              <li key={g.id} className="px-4 sm:px-5 py-3 border-b border-border last:border-b-0">
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <TeamScore t={g.away} done={done} />
                    <TeamScore t={g.home} done={done} />
                  </div>
                  <p className={`w-14 shrink-0 text-right text-[11px] font-semibold pt-0.5 ${g.state === 'in' ? 'text-positive-text' : 'text-muted'}`}>
                    {g.detail}
                  </p>
                </div>
                {(top || g.note) && (
                  <p className="text-[11px] text-secondary mt-1.5 truncate">
                    {top && <>🔥 {top.name} <span className="font-semibold text-foreground tabular-nums">{top.points}</span> pts</>}
                    {top && g.note && ' · '}
                    {g.note}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function NextNbaGames({ games, rostered }: { games: ScoreboardGame[]; rostered: Map<number, number> | null }) {
  return (
    <Card
      title="Next NBA games · Israel time"
      note={rostered ? '👥 = players on our league’s rosters (IR not counted)' : undefined}
    >
      {games.length === 0 ? (
        <p className="px-5 py-6 text-[12px] text-secondary text-center">No games scheduled</p>
      ) : (
        <ul>
          {games.map(g => {
            const ours = rostered ? (rostered.get(g.home.id) ?? 0) + (rostered.get(g.away.id) ?? 0) : null;
            return (
              <li key={g.id} className="flex items-center gap-3 px-4 sm:px-5 py-2.5 border-b border-border last:border-b-0">
                <div className="w-14 shrink-0">
                  {g.state === 'pre' ? (
                    <>
                      <p className="text-[15px] font-bold tabular-nums text-foreground leading-none">{israelTime(g.start)}</p>
                      <p className="text-[10px] text-muted mt-1">{israelDay(g.start)}</p>
                    </>
                  ) : (
                    <p className={`text-[11px] font-semibold ${g.state === 'in' ? 'text-positive-text' : 'text-muted'}`}>{g.detail}</p>
                  )}
                </div>
                <p className="flex-1 min-w-0 flex items-center gap-1.5 text-[14px] font-semibold text-foreground truncate">
                  <NbaLogo team={g.away.abbrev} size={20} />
                  {g.away.abbrev}
                  {g.state !== 'pre' && <span className="tabular-nums text-secondary"> {g.away.score}</span>}
                  <span className="text-muted font-normal px-0.5">@</span>
                  <NbaLogo team={g.home.abbrev} size={20} />
                  {g.home.abbrev}
                  {g.state !== 'pre' && <span className="tabular-nums text-secondary"> {g.home.score}</span>}
                </p>
                {ours !== null && ours > 0 && (
                  <span className="shrink-0 text-[11px] font-semibold text-secondary tabular-nums">👥 {ours}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
