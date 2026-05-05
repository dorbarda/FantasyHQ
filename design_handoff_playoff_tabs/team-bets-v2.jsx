/* global React */
// Team Bets V2 — "Series H2H Cards"
// One large card per series. Two teams head-to-head, with a vote bar between them
// and friend avatars stacked under the team they picked. Score badges next to avatars.

const TBV2 = (() => {
  const D = window.PLAYOFF_DATA;

  function H2HCard({ seriesId, isRound2 }) {
    const s = D.seriesResults.find(x => x.id === seriesId);
    if (!s) return null;
    const [teamA, teamB] = s.teams;
    const metaA = D.TEAMS[teamA];
    const metaB = D.TEAMS[teamB];

    const backersA = [];
    const backersB = [];
    D.owners.forEach(o => {
      const [pick, score] = D.bets[o.name]?.[seriesId] || [];
      if (pick === teamA) backersA.push({ ...o, score });
      else if (pick === teamB) backersB.push({ ...o, score });
    });

    const total = backersA.length + backersB.length;
    const pctA = total ? (backersA.length / total) * 100 : 50;
    const pctB = total ? (backersB.length / total) * 100 : 50;

    const winner = s.winner;
    const winnerSide = winner === teamA ? "A" : winner === teamB ? "B" : null;

    function renderBackers(list, team, isWinner, side) {
      const meta = D.TEAMS[team];
      return (
        <div style={{
          flex: 1, padding: "14px 16px",
          background: side === "A" ? "rgba(248,250,252,0.6)" : "rgba(241,245,249,0.5)",
          borderTop: `3px solid ${meta.primary}`,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {list.length === 0 && (
              <div style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>No backers</div>
            )}
            {list.map(b => {
              const correct = isWinner;
              const exact = correct && b.score === s.score;
              let pillBg = "#FFFFFF", pillColor = "#475569", pillBorder = "1px solid #E2E8F0";
              if (exact) { pillBg = "#FEF9C3"; pillColor = "#713F12"; pillBorder = "1px solid #EAB308"; }
              else if (correct) { pillBg = "#DCFCE7"; pillColor = "#14532D"; pillBorder = "1px solid transparent"; }
              else if (winner) { pillBg = "#FEE2E2"; pillColor = "#7F1D1D"; pillBorder = "1px solid transparent"; }

              return (
                <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <window.Avatar name={b.name} color={b.color} size={26} />
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#0F172A" }}>
                    {b.name.split(" ")[0]}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                    background: pillBg, color: pillColor, border: pillBorder,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {b.score || "—"}{exact && <span style={{ marginLeft: 3 }}>★</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div style={{
        background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14,
        overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        {/* Header: round label + status */}
        <div style={{
          padding: "10px 16px", background: "#F8FAFC",
          borderBottom: "1px solid #E2E8F0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            {s.label}
          </div>
          {winner ? (
            <div style={{ fontSize: 11, fontWeight: 700, color: "#10B981" }}>
              ✓ {D.TEAMS[winner].abbr} in {s.score}
            </div>
          ) : (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "#F59E0B" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#92400E", letterSpacing: "0.05em" }}>LIVE</span>
            </div>
          )}
        </div>

        {/* Matchup head with logos and split bar */}
        <div style={{ padding: "16px 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
              <window.TeamMark team={teamA} size={36} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {teamA.split(" ").slice(-1)[0]}
                </div>
                <div style={{ fontSize: 10, color: "#94A3B8" }}>{backersA.length} backer{backersA.length !== 1 ? "s" : ""}</div>
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>vs</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, justifyContent: "flex-end" }}>
              <div style={{ minWidth: 0, textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {teamB.split(" ").slice(-1)[0]}
                </div>
                <div style={{ fontSize: 10, color: "#94A3B8" }}>{backersB.length} backer{backersB.length !== 1 ? "s" : ""}</div>
              </div>
              <window.TeamMark team={teamB} size={36} />
            </div>
          </div>

          {/* Split vote bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              fontSize: 12, fontWeight: 800, color: metaA.primary, width: 36, textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}>
              {Math.round(pctA)}%
            </div>
            <div style={{ flex: 1, display: "flex", height: 10, borderRadius: 999, overflow: "hidden", background: "#F1F5F9" }}>
              <div style={{
                width: `${pctA}%`, background: metaA.primary,
                opacity: winnerSide === "B" ? 0.4 : 1,
                transition: "opacity 0.2s",
              }} />
              <div style={{
                width: `${pctB}%`, background: metaB.primary,
                opacity: winnerSide === "A" ? 0.4 : 1,
                transition: "opacity 0.2s",
              }} />
            </div>
            <div style={{
              fontSize: 12, fontWeight: 800, color: metaB.primary, width: 36,
              fontVariantNumeric: "tabular-nums",
            }}>
              {Math.round(pctB)}%
            </div>
          </div>
        </div>

        {/* Two backer columns */}
        <div style={{ display: "flex", borderTop: "1px solid #F1F5F9" }}>
          {renderBackers(backersA, teamA, winnerSide === "A", "A")}
          <div style={{ width: 1, background: "#E2E8F0" }} />
          {renderBackers(backersB, teamB, winnerSide === "B", "B")}
        </div>
      </div>
    );
  }

  function RoundRow({ kicker, title, count, ids }) {
    return (
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#94A3B8" }}>
            {kicker}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#94A3B8" }}>· {count}</div>
          <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {ids.map(id => <H2HCard key={id} seriesId={id} />)}
        </div>
      </div>
    );
  }

  return function TeamBetsV2() {
    return (
      <div>
        <window.ArtboardChrome
          active="Teams Bets"
          title="Teams Bets"
          subtitle="Series-by-series head-to-head — see who's split, who's contrarian, and who nailed the score."
        />
        <div style={{ padding: 24, background: "#F8FAFC", minHeight: 600 }}>
          <RoundRow
            kicker="Round 2"
            title="Conference Semifinals"
            count="4 active series"
            ids={["r2-e1","r2-e2","r2-w1","r2-w2"]}
          />
          <RoundRow
            kicker="Round 1"
            title="First Round"
            count="8 settled"
            ids={["r1-e1","r1-e2","r1-e3","r1-e4","r1-w1","r1-w2","r1-w3","r1-w4"]}
          />
        </div>
      </div>
    );
  };
})();

window.TeamBetsV2 = TBV2;
