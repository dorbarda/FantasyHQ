/* global React */
// Shared UI primitives for FantasyHQ playoff designs

const { useState, useMemo, useEffect } = React;

// Avatar — circular initials with owner color
window.Avatar = function Avatar({ name, size = 24, color = "#94A3B8", ring = false }) {
  const initials = (window.PLAYOFF_DATA.initials)(name);
  return (
    <div
      title={name}
      style={{
        width: size, height: size, borderRadius: "50%",
        background: color, color: "#fff",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.4, fontWeight: 700, letterSpacing: "0.02em",
        border: ring ? "2px solid #fff" : "none",
        boxShadow: ring ? "0 0 0 1px " + color : "none",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
};

// Team logo placeholder — colored monogram disc with secondary stripe
window.TeamMark = function TeamMark({ team, size = 32 }) {
  const meta = window.PLAYOFF_DATA.TEAMS[team] || { abbr: "—", primary: "#94A3B8", secondary: "#CBD5E1" };
  return (
    <div
      title={team}
      style={{
        width: size, height: size, borderRadius: "50%",
        background: meta.primary, color: "#fff",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.32, fontWeight: 800,
        position: "relative", overflow: "hidden", flexShrink: 0,
        border: `2px solid ${meta.secondary}`,
      }}
    >
      <span style={{ position: "relative", zIndex: 1 }}>{meta.abbr}</span>
    </div>
  );
};

// Status pill colors mirror the existing app
window.STATUS_STYLES = {
  exact:   { bg: "#FEF9C3", border: "2px solid #EAB308", color: "#713F12" },
  correct: { bg: "#DCFCE7", border: "1px solid transparent", color: "#14532D" },
  wrong43: { bg: "#FEF3C7", border: "1px solid transparent", color: "#92400E" },
  wrong:   { bg: "#FEE2E2", border: "1px solid transparent", color: "#7F1D1D" },
  pending: { bg: "#F8FAFC", border: "1px solid #E2E8F0", color: "#64748B" },
};

window.statusOf = function statusOf(pick, pickScore, winner, score) {
  if (!pick) return null;
  if (!winner) return "pending";
  if (pick === winner) {
    return (pickScore && score && pickScore === score) ? "exact" : "correct";
  }
  if (score === "4-3" && pickScore === "4-3") return "wrong43";
  return "wrong";
};

// Section header used inside artboards
window.SectionTitle = function SectionTitle({ kicker, title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {kicker && (
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: "0.16em",
          textTransform: "uppercase", color: "#94A3B8", marginBottom: 6,
        }}>{kicker}</div>
      )}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.01em" }}>
          {title}
        </div>
        {sub && (
          <div style={{ fontSize: 13, color: "#64748B" }}>{sub}</div>
        )}
      </div>
    </div>
  );
};

// Small mini-bar that compares two team pick counts
window.SplitBar = function SplitBar({ left, right, leftCount, rightCount, leftColor, rightColor, height = 6 }) {
  const total = leftCount + rightCount;
  const lp = total ? (leftCount / total) * 100 : 50;
  const rp = total ? (rightCount / total) * 100 : 50;
  return (
    <div style={{ display: "flex", height, borderRadius: 999, overflow: "hidden", background: "#F1F5F9" }}>
      <div style={{ width: `${lp}%`, background: leftColor }} />
      <div style={{ width: `${rp}%`, background: rightColor }} />
    </div>
  );
};

window.Streak = function Streak({ items, max = 8 }) {
  // items: array of "exact" | "correct" | "wrong" | null
  const trimmed = items.slice(-max);
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {trimmed.map((s, i) => {
        let bg = "#E2E8F0";
        if (s === "exact") bg = "#EAB308";
        else if (s === "correct") bg = "#10B981";
        else if (s === "wrong") bg = "#EF4444";
        return (
          <div key={i} style={{
            width: 8, height: 14, borderRadius: 2, background: bg,
          }} />
        );
      })}
    </div>
  );
};

// Brand panel header used at top of each artboard for context
window.ArtboardChrome = function ArtboardChrome({ active, title, subtitle }) {
  const tabs = ["Leaderboard", "Teams Bets", "Analytics", "My Bracket", "Results", "Scoring Rules"];
  return (
    <div style={{
      padding: "20px 24px 0", background: "#F8FAFC",
      borderBottom: "1px solid #E2E8F0",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>FantasyHQ</div>
        <div style={{ fontSize: 12, color: "#CBD5E1" }}>›</div>
        <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>NBA Playoffs 2025</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em", marginBottom: 2 }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>{subtitle}</div>
      )}
      <div style={{
        display: "inline-flex", gap: 4, padding: 4,
        background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 10,
        marginBottom: -1,
      }}>
        {tabs.map(t => (
          <div key={t} style={{
            padding: "6px 14px", fontSize: 13, fontWeight: 600, borderRadius: 6,
            background: t === active ? "#FFFFFF" : "transparent",
            color: t === active ? "#0F172A" : "#64748B",
            border: t === active ? "1px solid #E2E8F0" : "1px solid transparent",
            boxShadow: t === active ? "0 1px 2px rgba(15,23,42,0.04)" : "none",
          }}>{t}</div>
        ))}
      </div>
    </div>
  );
};

// Make components available globally for cross-script use
Object.assign(window, {
  Avatar: window.Avatar,
  TeamMark: window.TeamMark,
  SectionTitle: window.SectionTitle,
  SplitBar: window.SplitBar,
  Streak: window.Streak,
  ArtboardChrome: window.ArtboardChrome,
});
