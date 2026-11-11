'use server';

import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { TRADES_PUBLIC } from '@/lib/trades-launch';
import { TRADES_COOKIE, ADMIN_SLUG, canView, readSession } from '@/lib/owner-auth';
import { getLeagueRosters } from '@/lib/espn';
import { PRO_TEAM_ABBREV } from '@/lib/espn-schedule';
import { loadLatestTradeWeek } from '@/lib/trades-data';
import { ownerToSlug } from '@/lib/team-utils';
import { buildRequest, pickerRosters, requestsLeftToday, MAX_REQUESTS_PER_DAY } from '@/lib/trade-requests';
import { canSaveRequests, readRequestFile, saveRequestFile } from '@/lib/trade-requests-store';

export interface RequestFormState {
  error: string | null;
  sent: boolean;
}

/** Save a new trade request for the owner of `slug` (docs/TRADE-REQUESTS-SPEC.md). */
export async function submitTradeRequest(_prev: RequestFormState, form: FormData): Promise<RequestFormState> {
  const slug = String(form.get('slug') ?? '');
  const session = readSession((await cookies()).get(TRADES_COOKIE)?.value, process.env.OWNER_KEYS ?? '', Date.now());
  const allowed = TRADES_PUBLIC ? canView(session, slug) : session === ADMIN_SLUG;
  if (!allowed) return { error: 'Your session ended — open the page with your code again.', sent: false };
  if (!canSaveRequests()) return { error: 'Requests are not set up on this server.', sent: false };

  const deadline = loadLatestTradeWeek()?.tradeDeadline;
  if (deadline && Date.parse(deadline) <= Date.now()) return { error: 'The trade deadline has passed.', sent: false };

  let rosters;
  try {
    rosters = pickerRosters(await getLeagueRosters(), PRO_TEAM_ABBREV);
  } catch {
    return { error: 'Could not reach ESPN. Try again in a minute.', sent: false };
  }
  const owner = rosters.find(t => ownerToSlug(t.owner) === slug)?.owner;
  if (!owner) return { error: 'Your team was not found in ESPN.', sent: false };

  const by = session === ADMIN_SLUG ? 'commissioner' : 'owner';
  const now = new Date();
  const built = buildRequest(
    { owner, kind: String(form.get('kind') ?? ''), playerId: Number(form.get('playerId')), note: String(form.get('note') ?? ''), by },
    rosters, now, randomBytes(3).toString('hex'),
  );
  if ('error' in built) return { error: built.error, sent: false };

  // Two tries: the scheduled answer run may save the same file at the same moment.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { file, sha } = await readRequestFile(owner, slug);
    if (by === 'owner' && requestsLeftToday(file, now) === 0) {
      return { error: `You've used your ${MAX_REQUESTS_PER_DAY} requests for today. Try again tomorrow.`, sent: false };
    }
    const next = { ...file, owner, requests: [...file.requests, built.request] };
    const verb = built.request.kind === 'sell' ? 'trade' : 'get';
    if (await saveRequestFile(slug, next, sha, `chore: trade request — ${owner} wants to ${verb} ${built.request.playerName}`)) {
      revalidatePath(`/trades/${slug}`);
      return { error: null, sent: true };
    }
  }
  return { error: 'Could not save — try again.', sent: false };
}
