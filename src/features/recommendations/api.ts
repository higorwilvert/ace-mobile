import { z } from 'zod';

import { teamIndexSchema } from '@/features/matches/api';
import { apiRequest } from '@/lib/api-client';
import { genderPolicySchema, publicUserSchema } from '@/types/api';

// Allowlists do contrato de T13/T14 (protocolo T12): campo desconhecido é
// descartado (coordenadas, agenda e snapshots nunca chegam à UI); campo
// ausente ou fora de [0,1] vira CONTRACT_ERROR.
const score = z.number().finite().min(0).max(1);
export const factorsSchema = z.object({
  level: score,
  distance: score,
  activity: score,
  preferences: score,
});
export const modeSchema = z.enum(['SAME_GENDER', 'MIXED_PARTNER', 'OPEN']);
export const kindSchema = z.enum(['players', 'matches']);
const metaSchema = z.object({
  generationId: z.string().uuid(),
  generatedAt: z.string().datetime(),
  algorithmVersion: z.string().min(1),
  implementationVersion: z.string().min(1),
  weights: factorsSchema.refine(
    (w) =>
      Math.abs(w.level + w.distance + w.activity + w.preferences - 1) < 1e-8,
    'Pesos inválidos',
  ),
  sportId: z.number().int().positive(),
  teamSize: teamIndexSchema,
  mode: modeSchema,
  limit: z.number().int().min(1).max(100),
});
const itemSchema = z.object({
  recommendationId: z.string().uuid(),
  rank: z.number().int().positive(),
  totalScore: score,
  scoreBreakdown: factorsSchema,
  coldStart: z.boolean(),
  distanceMethod: z.enum(['COORDINATES', 'CITY_STATE']),
});
export const recommendedMatchCardSchema = z.object({
  id: z.string().uuid(),
  sportId: z.number().int(),
  title: z.string().nullable(),
  teamSize: teamIndexSchema,
  genderPolicy: genderPolicySchema,
  status: z.literal('OPEN'),
  visibility: z.literal('PUBLIC'),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int(),
  city: z.string(),
  state: z.string(),
  locationText: z.string().nullable(),
  arenaId: z.string().uuid().nullable(),
  minCategoryCode: z.string().nullable(),
  maxCategoryCode: z.string().nullable(),
  minRating: z.number().nullable(),
  maxRating: z.number().nullable(),
  capacity: z.object({
    teamSize: teamIndexSchema,
    total: z.number().int(),
    confirmed: z.number().int(),
    available: z.number().int(),
  }),
});
export const playerRecommendationsSchema = z.object({
  data: z.array(itemSchema.extend({ player: publicUserSchema })),
  meta: metaSchema.extend({
    scheduledAt: z.string().datetime().nullable(),
    durationMinutes: z.number().int().nullable(),
    availability: z.enum(['NOT_REQUESTED', 'CHECKED', 'TARGET_UNAVAILABLE']),
  }),
});
export const matchRecommendationsSchema = z.object({
  data: z.array(
    itemSchema.extend({
      suggestedTeamIndex: teamIndexSchema,
      match: recommendedMatchCardSchema,
    }),
  ),
  meta: metaSchema.extend({
    dateFrom: z.string().datetime().nullable(),
    dateTo: z.string().datetime().nullable(),
    latestStartAt: z.string().datetime(),
    availability: z.enum(['CHECKED', 'NOT_CONFIGURED']),
    emptyMatchPolicy: z.literal('EXCLUDE_NO_ROSTER'),
  }),
});

export type Factors = z.infer<typeof factorsSchema>;
export type RecommendationMode = z.infer<typeof modeSchema>;
export type RecommendationKind = z.infer<typeof kindSchema>;
export type RecommendationMeta = z.infer<typeof metaSchema>;
export type PlayerRecommendations = z.infer<typeof playerRecommendationsSchema>;
export type MatchRecommendations = z.infer<typeof matchRecommendationsSchema>;
export type RecommendedPlayer = PlayerRecommendations['data'][number];
export type RecommendedMatch = MatchRecommendations['data'][number];
export type RecommendationItem = z.infer<typeof itemSchema>;
export type RecommendationRequest = {
  kind: RecommendationKind;
  body: {
    sportId: number;
    teamSize: 1 | 2;
    mode: RecommendationMode;
    limit: number;
    scheduledAt?: string;
    durationMinutes?: number;
    dateFrom?: string;
    dateTo?: string;
  };
};
export type RecommendationResponse =
  | ({ kind: 'players' } & PlayerRecommendations)
  | ({ kind: 'matches' } & MatchRecommendations);

// Gerar grava snapshot + evento de auditoria na API: só um toque explícito
// chama estes POSTs — sem polling, refetch ao focar, retry ou prefetch.
export async function generateRecommendations(
  input: RecommendationRequest,
): Promise<RecommendationResponse> {
  if (input.kind === 'players')
    return {
      kind: 'players',
      ...(await apiRequest(
        'POST',
        '/v1/recommendations/players',
        playerRecommendationsSchema,
        input.body,
      )),
    };
  return {
    kind: 'matches',
    ...(await apiRequest(
      'POST',
      '/v1/recommendations/matches',
      matchRecommendationsSchema,
      input.body,
    )),
  };
}
