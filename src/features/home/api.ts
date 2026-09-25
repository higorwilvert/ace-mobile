import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { myInviteSchema } from '@/features/invites/api';
import { matchSummarySchema, teamIndexSchema } from '@/features/matches/api';
import {
  kindSchema,
  matchRecommendationsSchema,
  playerRecommendationsSchema,
} from '@/features/recommendations/api';
import { apiRequest } from '@/lib/api-client';
import { publicUserSchema, ratingTierSchema } from '@/types/api';

const count = z.number().int().min(0);
const teamsSchema = z.array(
  z.object({ teamIndex: teamIndexSchema, players: z.array(publicUserSchema) }),
);
export const kindErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export const homeSchema = z.object({
  principal: z
    .object({
      sport: z.object({
        id: z.number().int(),
        slug: z.string(),
        name: z.string(),
      }),
      rating: z.number().nullable(),
      matchesPlayed: count,
      tier: ratingTierSchema.nullable(),
    })
    .nullable(),
  nextMatch: z
    .object({ match: matchSummarySchema, teams: teamsSchema })
    .nullable(),
  upcomingCount: count,
  pending: z.object({
    invites: z.array(myInviteSchema),
    invitesTotal: count,
    applications: z.array(
      z.object({ match: matchSummarySchema, pendingCount: count }),
    ),
    applicationsTotal: count,
    results: z.array(matchSummarySchema),
    resultsTotal: count,
    friendRequests: count,
    availability: z.boolean(),
  }),
  suggestions: z
    .object({
      sportId: z.number().int(),
      stale: z.boolean(),
      players: playerRecommendationsSchema.extend({ total: count }).nullable(),
      matches: matchRecommendationsSchema.extend({ total: count }).nullable(),
    })
    .nullable(),
});
export const feedSchema = z.object({
  sportId: z.number().int().positive(),
  generated: z.array(kindSchema),
  players: z.union([playerRecommendationsSchema, kindErrorSchema]),
  matches: z.union([matchRecommendationsSchema, kindErrorSchema]),
});
export type Home = z.infer<typeof homeSchema>;
export type Feed = z.infer<typeof feedSchema>;
export type KindError = z.infer<typeof kindErrorSchema>;

export const homeKey = ['private', 'home'] as const;
export const feedKey = (sportId: number) =>
  ['private', 'recommendations', sportId] as const;
export const noticeKey = ['private', 'home-notice'] as const;

export const homeQuery = queryOptions({
  queryKey: homeKey,
  queryFn: async ({ signal }) =>
    (
      await apiRequest(
        'GET',
        '/v1/users/me/home',
        z.object({ data: homeSchema }),
        undefined,
        { signal },
      )
    ).data,
  staleTime: 30_000,
});

// Lê a última geração; a API só gera o tipo com 24 h ou mais (T38). Gerar
// grava auditoria, mas a janela de 24 h do servidor limita a uma por dia.
export const refreshRecommendations = async (sportId?: number) =>
  (
    await apiRequest(
      'POST',
      '/v1/recommendations/refresh',
      z.object({ data: feedSchema }),
      sportId ? { sportId } : {},
    )
  ).data;

export const feedQuery = (sportId: number) =>
  queryOptions({
    queryKey: feedKey(sportId),
    queryFn: () => refreshRecommendations(sportId),
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
