'use client';

import { useState } from 'react';
import Image from 'next/image';
import { HistoricalSeason, HistoricalTeam } from '@/lib/types';
import { teamLogoPath } from '@/lib/team-utils';

interface SeasonCardProps {
  season: HistoricalSeason;
  isBackToBack?: boolean;
}

// ── Avatar (logo or initials fallback) ───────────────────────────────────────

const AVATAR_COLORS = [
  '#C8956C', '#3B82F6', '#10B981', '#8B5CF6',
  '#F59E0B', '#EF4444', '#06B6D4', '#EC4899',
  '#84CC16', '#F97316', '#6366F1', '#14B8A6',
];

function teamColor(teamName: string): string {
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) hash = (hash * 31 + teamName.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(teamName: string): string {
  return teamName
    .replace(/[^a-zA-Z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || teamName.slice(0, 2).toUpperCase();
}

function Avatar({ teamName, size = 'md' }: { teamName: string; size?: 'sm' | 'md' | 'lg' }) {
  const logo = teamLogoPath(teamName);
  const px = size === 'lg' ? 56 : size === 'md' ? 44 : 32;
  const sizeClass = size === 'lg' ? 'w-14 h-14' : size === 'md' ? 'w-11 h-11' : 'w-8 h-8';

  if (logo) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden shrink-0 ring-2 ring-white bg-white shadow-sm`}>
        <Image src={logo} alt={teamName} width={px} height={px} className="w-full h-full object-cover" />
      </div>
    );
  }

  // Fallback: colored initials circle
  const color = teamColor(teamName);
  const textClass = size === 'lg' ? 'text-[18px]' : size === 'md' ? 'text-[14px]' : 'text-[11px]';
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-black text-white shrink-0 ring-2 ring-white`}
      style={{ backgroundColor: color }}
    >
      <span className={textClass}>{initials(teamName)}</span>
    </div>
  );
}

function PodiumSlot({
  team, rank, heightClass, labelColor, bgColor, borderColor, label,
}: {
  team: HistoricalTeam;
  rank: 1 | 2 | 3;
  heightClass: string;
  labelColor: string;
  bgColor: string;
  borderColor: string;
  label: string;
}) {
  const isCentre = rank === 1;
  return (
    <div className={`flex flex-col items-center gap-2 ${isCentre ? '-mt-6' : ''}`}>
      {/* Medal / rank chip */}
      <span
        className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
        style={{ color: labelColor, backgroundColor: `${labelColor}18`, border: `1px solid ${labelColor}40` }}
      >
        {label}
      </span>

      {/* Avatar */}
      <Avatar teamName={team.teamName} size={isCentre ? 'lg' : 'md'} />

      {/* Name + record */}
      <div className="text-center px-1">
        <p className={`font-bold leading-tight truncate max-w-[100px] text-[13px] ${isCentre ? 'text-[#0F172A]' : 'text-[#334155]'}`}>
          {team.teamName}
        </p>
        <p className="text-[11px] text-[#94A3B8] truncate max-w-[100px]">{team.ownerName.split(' ')[0]}</p>
        {team.wins > 0 && (
          <p className="text-[11px] font-semibold tabular-nums mt-0.5" style={{ color: labelColor }}>
            {team.wins}–{team.losses}
          </p>
        )}
      </div>

      {/* Podium block */}
      <div
        className={`w-full ${heightClass} rounded-t-lg flex items-center justify-center`}
        style={{ backgroundColor: bgColor, border: `2px solid ${borderColor}`, borderBottom: 'none' }}
      >
        <span className="text-[22px]">
          {rank === 1 ? '🏆' : rank === 2 ? '🥈' : '🥉'}
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SeasonCard({ season, isBackToBack = false }: SeasonCardProps) {
  const [showStandings, setShowStandings] = useState(false);

  const hasPodium = season.champion && season.runnerUp;

  // Find 3rd place from standings (not champion, not runner-up)
  const thirdPlace = season.finalStandings.find(
    t => t.teamName !== season.champion?.teamName && t.teamName !== season.runnerUp?.teamName
  ) ?? null;

  return (
    <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden bg-white shadow-sm">

      {/* ── Season header ──────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between border-b border-[#E2E8F0] bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[22px] font-black tracking-tight text-[#0F172A]">
              {season.seasonLabel}
            </h2>
            {isBackToBack && (
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#D97706] border border-[#F59E0B]/30">
                🔥 Back-to-Back
              </span>
            )}
          </div>
          {season.champion && (
            <p className="text-[13px] text-[#475569] mt-0.5">
              Champion: <span className="font-semibold text-[#0F172A]">{season.champion.ownerName}</span>
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {season.mvpPlayer && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C8956C]/15 text-[#C8956C] border border-[#C8956C]/30 flex items-center gap-1">
              ⭐ {season.mvpPlayer}
            </span>
          )}
          <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-widest">
            {season.year - 1}–{String(season.year).slice(2)}
          </span>
        </div>
      </div>

      {/* ── Podium ─────────────────────────────────────────────────── */}
      {hasPodium && (
        <div className="px-5 pt-6 pb-4">
          <div className="grid grid-cols-3 gap-2 items-end max-w-sm mx-auto">
            {/* 2nd place (left) */}
            <PodiumSlot
              team={season.runnerUp!}
              rank={2}
              heightClass="h-14"
              labelColor="#94A3B8"
              bgColor="#F1F5F9"
              borderColor="#CBD5E1"
              label="2nd"
            />
            {/* 1st place (centre) */}
            <PodiumSlot
              team={season.champion!}
              rank={1}
              heightClass="h-20"
              labelColor="#D97706"
              bgColor="#FFFBEB"
              borderColor="#F59E0B"
              label="Champion"
            />
            {/* 3rd place (right) */}
            {thirdPlace ? (
              <PodiumSlot
                team={thirdPlace}
                rank={3}
                heightClass="h-10"
                labelColor="#C8956C"
                bgColor="#FDF6F0"
                borderColor="#C8956C"
                label="3rd"
              />
            ) : (
              <div />
            )}
          </div>
        </div>
      )}

      {/* ── Last place "Shame" section ─────────────────────────────── */}
      {season.lastPlace && (
        <div className="mx-5 mb-4 px-3 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5]/40 flex items-center gap-2.5">
          {teamLogoPath(season.lastPlace.teamName) ? (
            <Image
              src={teamLogoPath(season.lastPlace.teamName)!}
              alt={season.lastPlace.teamName}
              width={32} height={32}
              className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-[#FCA5A5]/40 bg-white"
            />
          ) : (
            <span className="text-[18px] shrink-0">🚽</span>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#DC2626] mb-0.5">Toilet Bowl Champion</p>
            <p className="text-[13px] font-semibold text-[#0F172A] truncate">{season.lastPlace.teamName}</p>
            <p className="text-[11px] text-[#94A3B8]">
              {season.lastPlace.ownerName}
              {season.lastPlace.wins > 0 && ` · ${season.lastPlace.wins}–${season.lastPlace.losses}`}
            </p>
          </div>
        </div>
      )}

      {/* ── Notes / Quote ──────────────────────────────────────────── */}
      {season.notes && (
        <div className="mx-5 mb-4 pl-3 border-l-2 border-[#C8956C]">
          <p className="text-[13px] text-[#475569] italic leading-relaxed">
            &ldquo;{season.notes}&rdquo;
          </p>
        </div>
      )}

      {/* ── Full Standings toggle ───────────────────────────────────── */}
      {season.finalStandings.length > 0 && (
        <div className="border-t border-[#E2E8F0]">
          <button
            onClick={() => setShowStandings(v => !v)}
            className="w-full px-5 py-2.5 flex items-center justify-between text-[12px] font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-colors"
          >
            <span>Full Standings</span>
            <span className="text-[#94A3B8]">{showStandings ? '▲' : '▼'}</span>
          </button>

          {showStandings && (
            <div className="border-t border-[#E2E8F0]">
              {/* Column headers */}
              <div className="grid grid-cols-[28px_1fr_56px_68px] gap-x-2 px-5 py-2 bg-[#F8FAFC]">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">#</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Team</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">W–L</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] text-right">PF</span>
              </div>

              {season.finalStandings.map((team, idx) => {
                const isChamp    = team.teamName === season.champion?.teamName;
                const isRunnerup = team.teamName === season.runnerUp?.teamName;
                const isThird    = thirdPlace && team.teamName === thirdPlace.teamName;
                const isLast     = team.teamName === season.lastPlace?.teamName;
                const logo       = teamLogoPath(team.teamName);
                const color      = teamColor(team.teamName);

                return (
                  <div
                    key={`${team.teamName}-${idx}`}
                    className={`grid grid-cols-[36px_1fr_56px_68px] gap-x-2 items-center px-5 py-2.5 ${
                      idx < season.finalStandings.length - 1 ? 'border-b border-[#E2E8F0]' : ''
                    } ${isChamp ? 'bg-[#FFFBEB]' : isLast ? 'bg-[#FEF2F2]' : ''}`}
                  >
                    {/* Logo or colored rank bubble */}
                    <div className="relative w-8 h-8 shrink-0">
                      {logo ? (
                        <Image src={logo} alt={team.teamName} width={32} height={32} className="w-8 h-8 rounded-full object-cover ring-1 ring-[#E2E8F0] bg-white" />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: color }}>
                          {initials(team.teamName)}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#0F172A] text-white text-[8px] font-black flex items-center justify-center ring-1 ring-white">
                        {idx + 1}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-semibold truncate text-[#0F172A]">
                          {team.teamName}
                        </p>
                        {isChamp    && <span className="text-[9px] font-bold shrink-0">🏆</span>}
                        {isRunnerup && <span className="text-[9px] font-bold shrink-0">🥈</span>}
                        {isThird    && <span className="text-[9px] font-bold shrink-0">🥉</span>}
                        {isLast     && <span className="text-[9px] font-bold shrink-0">🚽</span>}
                      </div>
                      <p className="text-[11px] text-[#94A3B8] truncate">{team.ownerName}</p>
                    </div>

                    <span className="text-[12px] font-medium text-[#0F172A] text-right tabular-nums">
                      {team.wins > 0 || team.losses > 0 ? `${team.wins}–${team.losses}` : '—'}
                    </span>
                    <span className="text-[12px] font-medium text-[#94A3B8] text-right tabular-nums">
                      {team.pf > 0 ? team.pf.toLocaleString() : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
