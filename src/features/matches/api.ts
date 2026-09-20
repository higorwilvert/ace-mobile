import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/lib/api-client';
import {
  apiEnvelope,
  categorySchema,
  genderPolicySchema,
  levelSchema,
  publicUserSchema,
  sportSchema,
} from '@/types/api';

// Allowlists explícitas do contrato de T06/T07 (mesmas do web): campo
// desconhecido é ignorado, campo ausente vira CONTRACT_ERROR.
export const matchStatusSchema = z.enum([
  'DRAFT',
  'OPEN',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);
export const matchVisibilitySchema = z.enum(['PUBLIC', 'PRIVATE']);
export const participantStatusSchema = z.enum([
  'CONFIRMED',
  'PENDING',
  'DECLINED',
  'REMOVED',
]);
export const teamIndexSchema = z.union([z.literal(1), z.literal(2)]);
export const inviteStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'CANCELLED',
]);
const shortUser = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  avatarUrl: z.string().nullable(),
});
export const matchSummarySchema = z.object({
  genderPolicy: genderPolicySchema,
  minCategoryCode: z.string().nullable(),
  maxCategoryCode: z.string().nullable(),
  id: z.string().uuid(),
  sportId: z.number().int(),
  sport: sportSchema,
  teamSize: teamIndexSchema,
  visibility: matchVisibilitySchema,
  status: matchStatusSchema,
  title: z.string().nullable(),
  minLevel: levelSchema.nullable(),
  maxLevel: levelSchema.nullable(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int(),
  arena: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      city: z.string(),
      state: z.string(),
      address: z.string().nullable(),
    })
    .nullable(),
  locationText: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  creator: shortUser,
  capacity: z.object({
    teamSize: teamIndexSchema,
    total: z.number().int(),
    confirmed: z.number().int(),
    available: z.number().int(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export const matchParticipantSchema = z.object({
  id: z.string().uuid(),
  user: publicUserSchema,
  isCreator: z.boolean(),
  joinedAt: z.string().datetime(),
});
export const matchTeamSchema = z.object({
  id: z.string().uuid(),
  teamIndex: teamIndexSchema,
  label: z.string().nullable(),
  participants: z.array(matchParticipantSchema),
});
export const matchViewerSchema = z.object({
  isCreator: z.boolean(),
  participation: z
    .object({
      id: z.string().uuid(),
      status: participantStatusSchema,
      teamIndex: teamIndexSchema.nullable(),
    })
    .nullable(),
  // Convite pendente ao visitante (T08). T30 só o lê nas permissões; a UI
  // de aceitar/recusar chega em T31.
  invite: z
    .object({
      id: z.string().uuid(),
      status: inviteStatusSchema,
      teamIndex: teamIndexSchema.nullable(),
    })
    .nullable(),
});
// Placar registrado (T09). Parseado desde já para o detalhe não quebrar em
// partidas encerradas; a tela de resultado chega em T31.
export const matchResultSchema = z.object({
  id: z.string().uuid(),
  isDraw: z.boolean(),
  winnerTeamIndex: teamIndexSchema.nullable(),
  totalSets: z.number().int(),
  setsWon: z.object({ team1: z.number().int(), team2: z.number().int() }),
  sets: z.array(
    z.object({
      setNumber: z.number().int(),
      team1: z.number().int(),
      team2: z.number().int(),
      tiebreak: z
        .object({ team1: z.number().int(), team2: z.number().int() })
        .nullable(),
    }),
  ),
  notes: z.string().nullable(),
  recordedAt: z.string().datetime(),
  recordedBy: shortUser,
  ratingsProcessedAt: z.string().datetime().nullable(),
});
export const matchDetailSchema = matchSummarySchema.extend({
  description: z.string().nullable(),
  cancelledReason: z.string().nullable(),
  teams: z.array(matchTeamSchema),
  result: matchResultSchema.nullable(),
  viewer: matchViewerSchema.nullable(),
});
export const applicationSchema = z.object({
  id: z.string().uuid(),
  matchId: z.string().uuid(),
  status: participantStatusSchema,
  teamIndex: teamIndexSchema.nullable(),
  joinedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  user: publicUserSchema,
  sportProfile: z
    .object({
      declaredLevel: levelSchema.nullable(),
      category: categorySchema.nullable(),
      rating: z.number().nullable(),
    })
    .nullable(),
});
export const myApplicationSchema = z.object({
  id: z.string().uuid(),
  status: participantStatusSchema,
  teamIndex: teamIndexSchema.nullable(),
  joinedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  match: matchSummarySchema,
});
export const pageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    meta: z.object({ nextCursor: z.string().nullable() }),
  });

export type MatchStatus = z.infer<typeof matchStatusSchema>;
export type MatchVisibility = z.infer<typeof matchVisibilitySchema>;
export type ParticipantStatus = z.infer<typeof participantStatusSchema>;
export type TeamIndex = z.infer<typeof teamIndexSchema>;
export type InviteStatus = z.infer<typeof inviteStatusSchema>;
export type MatchSummary = z.infer<typeof matchSummarySchema>;
export type MatchDetail = z.infer<typeof matchDetailSchema>;
export type MatchTeam = z.infer<typeof matchTeamSchema>;
export type MatchParticipant = z.infer<typeof matchParticipantSchema>;
export type Application = z.infer<typeof applicationSchema>;
export type MyApplication = z.infer<typeof myApplicationSchema>;
export type Page<T> = { data: T[]; meta: { nextCursor: string | null } };

export type MatchSearchFilters = {
  sportId?: number;
  city?: string;
  state?: string;
  teamSize?: TeamIndex;
  categoryCode?: string;
  genderPolicy?: z.infer<typeof genderPolicySchema>;
  /** `YYYY-MM-DD` local; vira o início do dia em ISO. */
  dateFrom?: string;
  /** `YYYY-MM-DD` local; vira o fim do dia em ISO. */
  dateTo?: string;
};
export type MyMatchRole = 'all' | 'creator' | 'participant';
export type MyMatchesFilters = { role?: MyMatchRole; status?: MatchStatus };

const PAGE_LIMIT = 20;
export const matchPath = (id: string) =>
  `/v1/matches/${z.string().uuid().parse(id)}`;

/** Converte a data local `YYYY-MM-DD` no início ou no fim do dia, em ISO. */
export function dayBoundary(date: string | undefined, edge: 'start' | 'end') {
  if (!date) return undefined;
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  const value =
    edge === 'start'
      ? new Date(year, month - 1, day, 0, 0, 0, 0)
      : new Date(year, month - 1, day, 23, 59, 59, 999);
  return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
}
export function searchParams(filters: MatchSearchFilters) {
  return {
    sportId: filters.sportId,
    city: filters.city,
    state: filters.state,
    teamSize: filters.teamSize,
    categoryCode: filters.sportId ? filters.categoryCode : undefined,
    genderPolicy: filters.genderPolicy,
    dateFrom: dayBoundary(filters.dateFrom, 'start'),
    dateTo: dayBoundary(filters.dateTo, 'end'),
  };
}

export const matchKeys = {
  all: ['private', 'matches'] as const,
  search: (filters: MatchSearchFilters) =>
    [...matchKeys.all, 'search', filters] as const,
  mine: (filters: MyMatchesFilters) =>
    [...matchKeys.all, 'mine', filters] as const,
  detail: (id: string) => [...matchKeys.all, 'detail', id] as const,
  applications: (id: string, status?: ParticipantStatus) =>
    [...matchKeys.all, 'applications', id, status ?? 'all'] as const,
  myApplications: (status?: ParticipantStatus) =>
    ['private', 'my-applications', status ?? 'all'] as const,
};

const summaryPage = pageSchema(matchSummarySchema);
export const searchMatchesQuery = (filters: MatchSearchFilters) =>
  infiniteQueryOptions({
    queryKey: matchKeys.search(filters),
    queryFn: ({ pageParam, signal }) =>
      apiRequest('GET', '/v1/matches', summaryPage, undefined, {
        signal,
        params: {
          ...searchParams(filters),
          limit: PAGE_LIMIT,
          cursor: pageParam,
        },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
export const myMatchesQuery = (filters: MyMatchesFilters) =>
  infiniteQueryOptions({
    queryKey: matchKeys.mine(filters),
    queryFn: ({ pageParam, signal }) =>
      apiRequest('GET', '/v1/matches/mine', summaryPage, undefined, {
        signal,
        params: {
          role: filters.role,
          status: filters.status,
          limit: PAGE_LIMIT,
          cursor: pageParam,
        },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
// Vagas e times mudam pelas mãos de outros jogadores: o detalhe se atualiza
// ao voltar ao primeiro plano e a cada 15 s enquanto a tela está aberta.
export const matchQuery = (id: string) =>
  queryOptions({
    queryKey: matchKeys.detail(id),
    queryFn: async ({ signal }) =>
      (
        await apiRequest(
          'GET',
          matchPath(id),
          apiEnvelope(matchDetailSchema),
          undefined,
          { signal },
        )
      ).data,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
  });
export const applicationsQuery = (id: string, status?: ParticipantStatus) =>
  queryOptions({
    queryKey: matchKeys.applications(id, status),
    queryFn: async ({ signal }) =>
      (
        await apiRequest(
          'GET',
          `${matchPath(id)}/applications`,
          apiEnvelope(z.array(applicationSchema)),
          undefined,
          { signal, params: { status } },
        )
      ).data,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
  });
export const myApplicationsQuery = (status?: ParticipantStatus) =>
  infiniteQueryOptions({
    queryKey: matchKeys.myApplications(status),
    queryFn: ({ pageParam, signal }) =>
      apiRequest(
        'GET',
        '/v1/users/me/applications',
        pageSchema(myApplicationSchema),
        undefined,
        { signal, params: { status, limit: PAGE_LIMIT, cursor: pageParam } },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

const detail = apiEnvelope(matchDetailSchema);
const application = apiEnvelope(applicationSchema);
export const createMatch = (payload: unknown) =>
  apiRequest('POST', '/v1/matches', detail, payload);
export const updateMatch = (id: string, payload: unknown) =>
  apiRequest('PATCH', matchPath(id), detail, payload);
export const publishMatch = (id: string) =>
  apiRequest('POST', `${matchPath(id)}/publish`, detail);
export const cancelMatch = (id: string, payload: { reason?: string | null }) =>
  apiRequest('POST', `${matchPath(id)}/cancel`, detail, payload);
export const applyToMatch = (id: string, payload: { teamIndex?: TeamIndex }) =>
  apiRequest('POST', `${matchPath(id)}/applications`, application, payload);
export const withdrawApplication = (id: string) =>
  apiRequest('DELETE', `${matchPath(id)}/applications/me`, z.void());
export const approveApplication = (
  id: string,
  applicationId: string,
  payload: { teamIndex?: TeamIndex },
) =>
  apiRequest(
    'POST',
    `${matchPath(id)}/applications/${z.string().uuid().parse(applicationId)}/approve`,
    application,
    payload,
  );
export const rejectApplication = (id: string, applicationId: string) =>
  apiRequest(
    'POST',
    `${matchPath(id)}/applications/${z.string().uuid().parse(applicationId)}/reject`,
    application,
  );
export const removeParticipant = (id: string, participantId: string) =>
  apiRequest(
    'DELETE',
    `${matchPath(id)}/participants/${z.string().uuid().parse(participantId)}`,
    z.void(),
  );
