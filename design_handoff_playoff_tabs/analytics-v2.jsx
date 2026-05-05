/* global React */
// Analytics V2 — "Editorial Recap"
// Magazine layout: huge type, story-driven sections, sparkline-like visuals.

const ANV2 = (() => {
  const D = window.PLAYOFF_DATA;

  function BigStat({ label, value, sub, color = "#0F172A" }) {
    return (
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 8 }}>
          {label}
        </div>
        <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: "-0.04em", color, lineHeight: 0.95, marginBottom: 6 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: "#64748B", maxWidth: 200 }}>{sub}</div>
      </div>
    );
  }

  // Cumulative points sparkline per friend
  function PointsTrajectory() {
    const completed = D.seriesResults.filter(s => s.winner);
    // For each owner, build cumulative array
    const lines = D.standings.map(o => {
      let cum = 0;
      const path = [0];
      completed.forEach(s => {
        const [pick, score] = D.bets[o.name]?.[s.id] || [];
        if (!pick) { path.push(cum); return; }
        if (pick === s.winner) {
          cum += 2;
          if (score === s.score) cum += 2;
        } else if (s.score === "4-3" && score === "4-3") {
          cum += 1;
        }
        path.push(cum);
      });
      return { ...o, path };
    });

    const maxY = Math.max(...lines.flatMap(l => l.path), 10);
    const W = 520, H = 200, P = 12;
    const stepX = (W - 2 * P) / Math.max(1, completed.length);

    return (
      <div style={{ background: "#0F172A", borderRadius: 16, padding: 24, color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 6 }}>
              Trajectory
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>The race so far</div>
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>Cumulative pts · Round 1</div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => (
            <line key={t} x1={P} x2={W - P} y1={P + (H - 2*P) * t} y2={P + (H - 2*P) * t}
              stroke="rgba(255,255,255,0.08)" />
          ))}
          {/* Lines */}
          {lines.map(l => {
            const pts = l.path.map((y, i) => {
              const px = P + i * stepX;
              const py = P + (H - 2*P) * (1 - y / maxY);
              return `${px},${py}`;
            }).join(" ");
            return (
              <g key={l.name}>
                <polyline fill="none" stroke={l.color} strokeWidth="2" points={pts} opacity="0.9" />
                <circle cx={P + (l.path.length - 1) * stepX} cy={P + (H - 2*P) * (1 - l.path[l.path.length - 1] / maxY)} r="3.5" fill={l.color} />
              </g>
            );
          })}
        </svg>
        {/* Legend chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          {lines.slice().sort((a,b) => b.path[b.path.length - 1] - a.path[a.path.length - 1]).map(l => (
            <div key={l.name} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "3px 10px 3px 3px", background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999,
            }}>
              <window.Avatar name={l.name} color={l.color} size={20} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>{l.name.split(" ")[0]}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: l.color, marginLeft: 4, fontVariantNumeric: "tabular-nums" }}>
                {l.path[l.path.length - 1]}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function ConsensusFever() {
    // For each round-2 active series, find % consensus and the contrarian
    const active = D.seriesResults.filter(s => !s.winner && s.round === 2);
    return (
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: 22 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 6 }}>
            Consensus
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "#0F172A" }}>Where the room agrees</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {active.map(s => {
            const counts = D.pickDistribution(s.id);
            const entries = Object.entries(counts).sort((a,b) => b[1] - a[1]);
            const total = entries.reduce((a, [,v]) => a + v, 0);
            const top = entries[0];
            const meta = top ? D.TEAMS[top[0]] : null;
            const topPct = total ? Math.round((top[1] / total) * 100) : 0;
            return (
              <div key={s.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>{total} picks</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {meta && <window.TeamMark team={top[0]} size={28} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>
                      {top[0].split(" ").slice(-1)[0]} <span style={{ color: "#94A3B8", fontWeight: 500 }}>favored</span>
                    </div>
                    <div style={{ height: 8, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${topPct}%`, height: "100%", background: meta?.primary || "#94A3B8" }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: meta?.primary, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                    {topPct}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function FormStrip() {
    return (
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: 22 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 6 }}>
            Form
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "#0F172A" }}>Last 8 picks</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {D.standings.map(s => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <window.Avatar name={s.name} color={s.color} size={24} />
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", flex: 1 }}>
                {s.name}
              </div>
              <window.Streak items={s.streak} max={8} />
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", width: 38, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {s.total}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, paddingTop: 10, borderTop: "1px solid #F1F5F9" }}>
          {[
            { label: "Exact", color: "#EAB308" },
            { label: "Correct", color: "#10B981" },
            { label: "Wrong", color: "#EF4444" },
          ].map(l => (
            <div key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 12, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: 10, color: "#64748B" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function UpsetStory() {
    const upsets = D.seriesResults.filter(s => s.winner && s.teams[1] === s.winner);
    return (
      <div style={{
        background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 16, padding: 24,
      }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#92400E", marginBottom: 6 }}>
            Upset of the round
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.025em", color: "#0F172A", lineHeight: 1.05 }}>
            Wolves over Nuggets,<br />in six.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
          <window.TeamMark team="Minnesota Timberwolves" size={48} />
          <div style={{ fontSize: 22, fontWeight: 800, color: "#94A3B8" }}>over</div>
          <window.TeamMark team="Denver Nuggets" size={48} />
          <div style={{ fontSize: 24, fontWeight: 900, color: "#0F172A", marginLeft: "auto", letterSpacing: "-0.02em" }}>4–2</div>
        </div>
        <div style={{ fontSize: 13, color: "#0F172A", lineHeight: 1.5, marginBottom: 14, textWrap: "pretty" }}>
          Every member of the pool picked Denver. Nobody saw it coming — the bracket-wide miss cost the room {D.owners.length * 2} potential points.
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.5)", borderRadius: 10, border: "1px solid rgba(146,64,14,0.15)" }}>
          <div style={{ fontSize: 18 }}>🚫</div>
          <div style={{ fontSize: 12, color: "#92400E", fontWeight: 600 }}>
            <strong>0 of 9</strong> friends called it. Group blind spot of the playoffs.
          </div>
        </div>
      </div>
    );
  }

  function PicksHeatmap() {
    // count picks per team, group by conference & round
    const counts = {};
    D.seriesResults.forEach(s => {
      D.owners.forEach(o => {
        const [pick] = D.bets[o.name]?.[s.id] || [];
        if (pick) counts[pick] = (counts[pick] || 0) + 1;
      });
    });
    const ranked = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    const top5 = ranked.slice(0, 5);
    const bottom5 = ranked.slice(-5).reverse();

    function Row({ team, picks, max }) {
      const meta = D.TEAMS[team];
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
          <window.TeamMark team={team} size={24} />
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", flex: 1 }}>
            {team.split(" ").slice(-1)[0]}
          </div>
          <div style={{ width: 80, height: 5, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${(picks/max)*100}%`, height: "100%", background: meta?.primary || "#94A3B8" }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", width: 24, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {picks}
          </div>
        </div>
      );
    }

    const max = top5[0][1];
    return (
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 6 }}>
              Most loved
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", marginBottom: 10 }}>Bracket favorites</div>
            {top5.map(([t, p]) => <Row key={t} team={t} picks={p} max={max} />)}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 6 }}>
              Least loved
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", marginBottom: 10 }}>Lonely calls</div>
            {bottom5.map(([t, p]) => <Row key={t} team={t} picks={p} max={max} />)}
          </div>
        </div>
      </div>
    );
  }

  return function AnalyticsV2() {
    const leader = D.standings[0];
    const second = D.standings[1];
    const totalPicks = D.standings.reduce((a,s) => a + s.picks, 0);
    const totalCorrect = D.standings.reduce((a,s) => a + s.correct, 0);
    const groupAcc = totalPicks ? Math.round((totalCorrect / totalPicks) * 100) : 0;
    const totalExact = D.standings.reduce((a,s) => a + s.exact, 0);

    return (
      <div>
        <window.ArtboardChrome
          active="Analytics"
          title="Analytics"
          subtitle="The story of the pool — leader, trajectory, upsets, and where the room agrees."
        />
        <div style={{ padding: 24, background: "#F8FAFC", minHeight: 600 }}>
          {/* Editorial header — three big stats */}
          <div style={{
            background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16,
            padding: 28, marginBottom: 18,
            display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 32, alignItems: "end",
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 8 }}>
                Pool leader
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
                <window.Avatar name={leader.name} color={leader.color} size={56} />
                <div>
                  <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", color: "#0F172A", lineHeight: 1 }}>
                    {leader.name}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
                    +{leader.total - second.total} pts ahead of {second.name.split(" ")[0]}
                  </div>
                </div>
              </div>
            </div>
            <BigStat label="Points" value={leader.total} sub="Total accumulated" color={leader.color} />
            <BigStat label="Accuracy" value={`${groupAcc}%`} sub={`${totalCorrect} of ${totalPicks} picks correct group-wide`} />
            <BigStat label="Exacts" value={totalExact} sub="Series scores called perfectly" color="#EAB308" />
          </div>

          {/* Trajectory + form */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 18 }}>
            <PointsTrajectory />
            <FormStrip />
          </div>

          {/* Upset story + consensus */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <UpsetStory />
            <ConsensusFever />
          </div>

          {/* Heatmap */}
          <PicksHeatmap />
        </div>
      </div>
    );
  };
})();

window.AnalyticsV2 = ANV2;
