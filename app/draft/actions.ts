'use server';

import { getDraftBoard, DRAFT_YEARS } from '@/lib/espn-draft';
import type { DraftGrade } from '@/lib/types';

export interface PlayerSeasonData {
  year: number;
  seasonLabel: string;
  overallPick: number;
  grade: DraftGrade;
  ownerName: string;
  position: string;
  proTeam: string;
}

export interface PlayerHistoryResult {
  playerName: string;
  seasons: PlayerSeasonData[];
  avgPick: number;
  avgGrade: string;
}

const GRADE_SCORE: Record<string, number> = {
  'A+': 7, A: 6, B: 5, C: 4, D: 3, F: 2,
};

function avgGradeLabel(seasons: PlayerSeasonData[]): string {
  const scored = seasons.filter(s => s.grade in GRADE_SCORE);
  if (scored.length === 0) return '?';
  const avg = scored.reduce((sum, s) => sum + GRADE_SCORE[s.grade], 0) / scored.length;
  if (avg >= 6.5) return 'A+';
  if (avg >= 5.5) return 'A';
  if (avg >= 4.5) return 'B';
  if (avg >= 3.5) return 'C';
  if (avg >= 2.5) return 'D';
  return 'F';
}

export async function searchPlayerHistory(query: string): Promise<PlayerHistoryResult[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  // Fetch all years in parallel, ignoring failures
  const boards = await Promise.allSettled(
    DRAFT_YEARS.map(y => getDraftBoard(y))
  );

  // Map: normalized player name → seasons[]
  const map = new Map<string, { canonical: string; seasons: PlayerSeasonData[] }>();

  boards.forEach((result, idx) => {
    if (result.status !== 'fulfilled') return;
    const board = result.value;
    board.picks.forEach(pick => {
      const normalized = pick.playerName.toLowerCase();
      if (!normalized.includes(q)) return;

      if (!map.has(normalized)) {
        map.set(normalized, { canonical: pick.playerName, seasons: [] });
      }
      map.get(normalized)!.seasons.push({
        year: board.year,
        seasonLabel: board.seasonLabel,
        overallPick: pick.overallPick,
        grade: pick.grade,
        ownerName: pick.ownerName,
        position: pick.position,
        proTeam: pick.proTeam,
      });
    });

    // suppress unused idx warning
    void idx;
  });

  const results: PlayerHistoryResult[] = [];

  map.forEach(({ canonical, seasons }) => {
    seasons.sort((a, b) => a.year - b.year);
    const avgPick = Math.round(
      seasons.reduce((sum, s) => sum + s.overallPick, 0) / seasons.length
    );
    results.push({
      playerName: canonical,
      seasons,
      avgPick,
      avgGrade: avgGradeLabel(seasons),
    });
  });

  // Sort by most seasons drafted, then by avg pick
  results.sort((a, b) =>
    b.seasons.length - a.seasons.length || a.avgPick - b.avgPick
  );

  return results.slice(0, 10);
}
