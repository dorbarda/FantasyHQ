export interface WeeklyScoreEntry {
  ownerName: string;
  teamName: string;
  week: number;
  score: number;
  opponentName: string;
  opponentScore: number;
  won: boolean | null;
  margin: number;
}

function ScoreRow({
  entry,
  rank,
  showRank = true,
}: {
  entry: WeeklyScoreEntry;
  rank: number;
  showRank?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[#E2E8F0]/50 last:border-0">
      {showRank && (
        <span className="text-[13px] font-bold text-[#475569] font-mono w-5 shrink-0 text-right">{rank}</span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#0F172A]">{entry.ownerName}</span>
          <span className="text-[11px] text-[#475569]">Wk {entry.week}</span>
        </div>
        <p className="text-[11px] text-[#475569] mt-0.5 truncate">
          vs {entry.opponentName} ({entry.opponentScore.toFixed(1)})
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[15px] font-bold font-mono text-[#0F172A]">{entry.score.toFixed(1)}</p>
        {entry.won !== null && (
          <span className={`text-[10px] font-bold ${entry.won ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
            {entry.won ? 'W' : 'L'}
          </span>
        )}
      </div>
    </div>
  );
}

export default function WeeklyHighlights({
  topScores,
  bottomScores,
  biggestBlowouts,
}: {
  topScores: WeeklyScoreEntry[];
  bottomScores: WeeklyScoreEntry[];
  biggestBlowouts: WeeklyScoreEntry[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Top performances */}
      <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#34D399] mb-3">
          Top Scores
        </p>
        {topScores.map((e, i) => (
          <ScoreRow key={`${e.ownerName}-${e.week}`} entry={e} rank={i + 1} />
        ))}
      </div>

      {/* Worst performances */}
      <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#F87171] mb-3">
          Lowest Scores
        </p>
        {bottomScores.map((e, i) => (
          <ScoreRow key={`${e.ownerName}-${e.week}`} entry={e} rank={i + 1} />
        ))}
      </div>

      {/* Biggest blowouts */}
      <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#C8956C] mb-3">
          Biggest Wins
        </p>
        {biggestBlowouts.map((e, i) => (
          <div key={`${e.ownerName}-${e.week}`} className="flex items-center gap-3 py-2.5 border-b border-[#E2E8F0]/50 last:border-0">
            <span className="text-[13px] font-bold text-[#475569] font-mono w-5 shrink-0 text-right">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#0F172A]">{e.ownerName}</span>
                <span className="text-[11px] text-[#475569]">Wk {e.week}</span>
              </div>
              <p className="text-[11px] text-[#475569] mt-0.5 truncate">
                def. {e.opponentName}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[15px] font-bold font-mono text-[#34D399]">+{e.margin.toFixed(1)}</p>
              <p className="text-[10px] text-[#475569]">{e.score.toFixed(1)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
