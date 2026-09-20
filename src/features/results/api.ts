import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import {
  matchPath,
  matchResultSchema,
  matchSummarySchema,
  pageSchema,
  type TeamIndex,
  teamIndexSchema,
} from '@/features/matches/api';
import { apiRequest } from '@/lib/api-client';
import { apiEnvelope, publicUserSchema, sportSchema } from '@/types/api';

// Allowlists do contrato de T09/T11 (resultados, histórico e variação de
// rating): campo desconhecido é ignorado, campo ausente vira CONTRACT_ERROR.
export const outcomeSchema = z.enum(['WIN', 'LOSS', 'DRAW']);
// Set na perspectiva do usuário: `own` é o placar do time dele.
export const historySetSchema = z.object({
  setNumber: z.number().int(),
  own: z.number().int(),
  opponent: z.number().int(),
  tiebreak: z
    .object({ own: z.number().int(), opponent: z.number().int() })
    .nullable(),
});
export const ratingChangeSchema = z.object({
  ratingBefore: z.number().finite(),
  ratingAfter: z.number().finite(),
  rdBefore: z.number().finite().nonnegative(),
  rdAfter: z.number().finite().nonnegative(),
  volatilityBefore: z.number().finite().positive(),
  volatilityAfter: z.number().finite().positive(),
  algorithmVersion: z.string().min(1),
  processedAt: z.string().datetime(),
});
export const historyEntrySchema = z.object({
  ratingChange: ratingChangeSchema.nullable(),
  match: matchSummarySchema,
  teamIndex: teamIndexSchema,
  outcome: outcomeSchema,
  setsWon: z.number().int(),
  setsLost: z.number().int(),
  sets: z.array(historySetSchema),
  teammates: z.array(publicUserSchema),
  opponents: z.array(publicUserSchema),
  result: z.object({
    id: z.string().uuid(),
    isDraw: z.boolean(),
    winnerTeamIndex: teamIndexSchema.nullable(),
    recordedAt: z.string().datetime(),
  }),
});
// RF25: `matches = wins + losses + draws`, derivados da mesma consulta do histórico.
export const sportTotalsSchema = z.object({
  sportId: z.number().int(),
  sport: sportSchema,
  matches: z.number().int(),
  wins: z.number().int(),
  losses: z.number().int(),
  draws: z.number().int(),
});

export type Outcome = z.infer<typeof outcomeSchema>;
export type HistorySet = z.infer<typeof historySetSchema>;
export type RatingChange = z.infer<typeof ratingChangeSchema>;
export type HistoryEntry = z.infer<typeof historyEntrySchema>;
export type SportTotals = z.infer<typeof sportTotalsSchema>;
export type MatchResult = z.infer<typeof matchResultSchema>;
export type ResultPayload = {
  sets: {
    team1: number;
    team2: number;
    tiebreak?: { team1: number; team2: number };
  }[];
  winnerTeamIndex?: TeamIndex;
  isDraw?: true;
  notes?: string;
};

const PAGE_LIMIT = 20;
/** `'me'` usa a rota própria (token obrigatório); um id usa a rota pública (token opcional). */
const historyPath = (userId: string) =>
  userId === 'me'
    ? '/v1/users/me/history'
    : `/v1/users/${z.string().uuid().parse(userId)}/history`;

export const historyKeys = {
  all: ['private', 'history'] as const,
  list: (userId: string, sportId?: number) =>
    [...historyKeys.all, 'list', userId, sportId ?? 'all'] as const,
  summary: (userId: string) => [...historyKeys.all, 'summary', userId] as const,
};

const historyPage = pageSchema(historyEntrySchema);
/** Histórico paginado (keyset) de um jogador; `'me'` para o próprio. */
export const historyQuery = (userId: string, sportId?: number) =>
  infiniteQueryOptions({
    queryKey: historyKeys.list(userId, sportId),
    queryFn: ({ pageParam, signal }) =>
      apiRequest('GET', historyPath(userId), historyPage, undefined, {
        signal,
        auth: userId === 'me' ? 'required' : 'optional',
        params: { sportId, limit: PAGE_LIMIT, cursor: pageParam },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
/** Totais por modalidade, da mesma fonte do histórico (RF25). */
export const summaryQuery = (userId: string) =>
  queryOptions({
    queryKey: historyKeys.summary(userId),
    queryFn: async ({ signal }) =>
      (
        await apiRequest(
          'GET',
          `${historyPath(userId)}/summary`,
          apiEnvelope(z.array(sportTotalsSchema)),
          undefined,
          { signal, auth: userId === 'me' ? 'required' : 'optional' },
        )
      ).data,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

export const recordResult = (matchId: string, payload: ResultPayload) =>
  apiRequest(
    'POST',
    `${matchPath(matchId)}/result`,
    apiEnvelope(matchResultSchema),
    payload,
  );
