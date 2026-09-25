import type { FeedItem } from '@/features/activity/api';
import type { RecommendationResponse } from '@/features/recommendations/api';
import { scoreline } from '@/features/results/schemas';
import type { PublicUser } from '@/types/api';

import type { Feed, Home, KindError } from './api';

type Kind = 'players' | 'matches';
const KINDS: Kind[] = ['players', 'matches'];

export const isKindError = (value: object): value is KindError =>
  'error' in value;

/** Ações pendentes; sem disponibilidade conta como uma (bloqueia partidas). */
export const pendingCount = (p: Home['pending']) =>
  p.invitesTotal +
  p.applicationsTotal +
  p.resultsTotal +
  p.friendRequests +
  (p.availability ? 0 : 1);

const joinNames = (names: string[]) =>
  names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`;

/** "Você e Thiago" / "Juliana e Gabriela": primeiro nome, o próprio usuário primeiro. */
export function teamLabel(players: PublicUser[], viewerId?: string) {
  const mine = players.filter((p) => p.id === viewerId).map(() => 'Você');
  const others = players
    .filter((p) => p.id !== viewerId)
    .map((p) => p.fullName.split(' ')[0]);
  return joinNames([...mine, ...others]);
}

/**
 * "Juliana e Gabriela venceram Camila e Larissa" + placar do lado vencedor;
 * com `viewerId`, o próprio usuário vira "Você" ("…venceram você e Bruno").
 */
export function activityLine(
  item: Pick<FeedItem, 'teams' | 'result'>,
  viewerId?: string,
) {
  const team = (index: 1 | 2) =>
    item.teams.find((t) => t.teamIndex === index)?.players ?? [];
  const { result } = item;
  const first = !result.isDraw && result.winnerTeamIndex === 2 ? 2 : 1;
  const [own, other] =
    first === 1 ? (['team1', 'team2'] as const) : (['team2', 'team1'] as const);
  const winners = team(first);
  const plural = winners.length > 1;
  const verb = result.isDraw
    ? plural
      ? 'empataram com'
      : 'empatou com'
    : plural
      ? 'venceram'
      : 'venceu';
  return {
    title: `${teamLabel(winners, viewerId)} ${verb} ${teamLabel(team(first === 1 ? 2 : 1), viewerId).replace(/^Você/, 'você')}`,
    score: scoreline(
      result.sets.map((set) => ({
        a: set[own],
        b: set[other],
        tiebreak: set.tiebreak
          ? { a: set.tiebreak[own], b: set.tiebreak[other] }
          : null,
      })),
    ),
  };
}

export function generatedLabel(iso: string, now = new Date()) {
  const minutes = Math.floor((now.getTime() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'ontem' : `há ${days} dias`;
}

export type Notice = { sportId: number; players: number; matches: number };

/** Só o que foi gerado nesta chamada conta como "novo". */
export function noticeOf(feed: Feed): Notice | null {
  const count = (kind: Kind) => {
    const value = feed[kind];
    return feed.generated.includes(kind) && !isKindError(value)
      ? value.data.length
      : 0;
  };
  const notice = {
    sportId: feed.sportId,
    players: count('players'),
    matches: count('matches'),
  };
  return notice.players + notice.matches > 0 ? notice : null;
}

export function noticeText(n: Notice, sportName: string) {
  const total = n.players + n.matches;
  const parts = [
    n.players
      ? `${n.players} ${n.players === 1 ? 'jogador' : 'jogadores'}`
      : '',
    n.matches ? `${n.matches} ${n.matches === 1 ? 'partida' : 'partidas'}` : '',
  ].filter(Boolean);
  return {
    title: `Há ${total} ${total === 1 ? 'sugestão nova' : 'sugestões novas'} para você`,
    detail: `${parts.join(' e ')} de ${sportName}`,
  };
}

/**
 * Um refresh proativo por snapshot velho: a chave muda quando surge uma
 * geração nova (ex.: 24 h depois, com a aba ainda montada) e não muda quando
 * um tipo falha sempre — então não entra em laço.
 */
export function refreshKey(home: Home): string | null {
  const s = home.suggestions;
  if (!s?.stale) return null;
  return [
    s.sportId,
    s.players?.meta.generationId ?? '-',
    s.matches?.meta.generationId ?? '-',
  ].join(':');
}

export type KindErrors = Partial<Record<Kind, string>>;
export function kindErrors(feed: Feed | undefined): KindErrors {
  const errors: KindErrors = {};
  if (feed)
    for (const kind of KINDS) {
      const value = feed[kind];
      if (isKindError(value)) errors[kind] = value.error.message;
    }
  return errors;
}

type Suggestions = NonNullable<Home['suggestions']>;
/** Resultado do refresh no bloco de sugestões do Início (mesma modalidade). */
export function mergeFeed(home: Home, feed: Feed): Home {
  if (!home.suggestions || home.suggestions.sportId !== feed.sportId)
    return home;
  const top = <T extends { data: unknown[] }>(value: T | KindError) =>
    isKindError(value)
      ? null
      : { ...value, data: value.data.slice(0, 3), total: value.data.length };
  return {
    ...home,
    suggestions: {
      sportId: feed.sportId,
      stale: false,
      players: top(feed.players) as Suggestions['players'],
      matches: top(feed.matches) as Suggestions['matches'],
    },
  };
}

/** Geração explícita ("Atualizar"/"Ajustar busca") substitui só o seu tipo. */
export function withGeneration(
  feed: Feed,
  response: RecommendationResponse,
): Feed {
  const { kind, ...value } = response;
  return { ...feed, [kind]: value };
}
