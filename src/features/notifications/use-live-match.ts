import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import type { SessionStatus } from '@/features/auth/session';
import { homeQuery, type Home } from '@/features/home/api';
import { matchQuery } from '@/features/matches/api';

import AceLiveUpdate from '../../../modules/ace-live-update';

import type { MatchActivityProps } from './match-activity';

// Partida confirmada que começa nas próximas 6 h (o iOS encerra uma Live
// Activity depois de 8 h ativa; 6 h + a duração cabe na maioria dos jogos).
const WINDOW_MS = 6 * 3_600_000;
const KEY = 'ace.live-match';
type Saved = MatchActivityProps & { matchId: string };
type NextMatch = NonNullable<Home['nextMatch']>;

// iOS: import tardio para o Expo Go (sem o módulo nativo) seguir funcionando.
function iosActivity() {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('./match-activity') as typeof import('./match-activity'))
      .default;
  } catch {
    return null;
  }
}

const hhmm = (ms: number) =>
  new Date(ms).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
const status = (s: Saved, now: number) =>
  now < s.startsAt ? `Começa às ${hhmm(s.startsAt)}` : 'Em quadra';

function fromNext({ match, teams }: NextMatch): Saved {
  const startsAt = Date.parse(match.scheduledAt);
  return {
    matchId: match.id,
    title: match.title ?? match.sport.name,
    place: match.arena?.name ?? match.locationText ?? match.city,
    teams: teams
      .map((t) => t.players.map((p) => p.fullName.split(' ')[0]).join(' & '))
      .join('  x  '),
    startsAt,
    endsAt: startsAt + match.durationMinutes * 60_000,
    status: '',
  };
}

async function show(live: Saved, previous: Saved | null) {
  const props = { ...live, status: status(live, Date.now()) };
  const url = `ace://matches/${live.matchId}`;
  await SecureStore.setItemAsync(KEY, JSON.stringify(live));
  if (Platform.OS === 'android') {
    AceLiveUpdate?.show({
      title: props.title,
      text: `${props.status} · ${props.place}\n${props.teams}`,
      chip: Date.now() < live.startsAt ? hhmm(live.startsAt) : 'Em quadra',
      startsAt: live.startsAt,
      endsAt: live.endsAt,
      url,
    });
    return;
  }
  const factory = iosActivity();
  if (!factory) return;
  const running = factory.getInstances();
  if (running.length && previous?.matchId === live.matchId) {
    await Promise.all(
      running.map((a) => a.update(props, new Date(live.endsAt))),
    );
    return;
  }
  await Promise.all(running.map((a) => a.end('immediate')));
  factory.start(props, url, new Date(live.endsAt));
}

async function end() {
  await SecureStore.deleteItemAsync(KEY);
  AceLiveUpdate?.hide();
  await Promise.all(
    (iosActivity()?.getInstances() ?? []).map((a) => a.end('immediate')),
  );
}

/**
 * Decide a Live Activity (iOS) / Live Update (Android) ao abrir o app e ao
 * voltar para ele: mostra a próxima partida confirmada; durante o jogo ela
 * some da home, então a partida salva vale até o fim, a menos que tenha sido
 * cancelada ou tenha placar.
 */
async function sync(next: Home['nextMatch'], client: QueryClient) {
  const now = Date.now();
  const raw = await SecureStore.getItemAsync(KEY);
  const saved = raw ? (JSON.parse(raw) as Saved) : null;
  if (next && Date.parse(next.match.scheduledAt) - now <= WINDOW_MS)
    return show(fromNext(next), saved);
  if (!saved || now >= saved.endsAt || now < saved.startsAt) return end();
  const match = await client
    .fetchQuery(matchQuery(saved.matchId))
    .catch(() => null);
  return match?.status === 'CONFIRMED' || match?.status === 'IN_PROGRESS'
    ? show(saved, saved)
    : end();
}

export function useLiveMatch(session: SessionStatus) {
  const client = useQueryClient();
  const signedIn = session === 'signed-in';
  const next = useQuery({ ...homeQuery, enabled: signedIn }).data?.nextMatch;

  useEffect(() => {
    if (session === 'signed-out') void end().catch(() => {});
    if (!signedIn || next === undefined) return;
    const run = () => void sync(next, client).catch(() => {});
    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => sub.remove();
  }, [session, signedIn, next, client]);
}
