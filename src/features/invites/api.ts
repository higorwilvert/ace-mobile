import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import {
  type InviteStatus,
  inviteStatusSchema,
  matchSummarySchema,
  pageSchema,
  type TeamIndex,
  teamIndexSchema,
} from '@/features/matches/api';
import { apiRequest } from '@/lib/api-client';
import {
  apiEnvelope,
  categorySchema,
  levelSchema,
  publicUserSchema,
} from '@/types/api';

// Allowlists do contrato de T08 (convites esportivos), portadas 1:1 do web.
export const inviteSchema = z.object({
  id: z.string().uuid(),
  matchId: z.string().uuid(),
  status: inviteStatusSchema,
  teamIndex: teamIndexSchema.nullable(),
  message: z.string().nullable(),
  inviter: publicUserSchema,
  invitee: publicUserSchema.extend({
    sportProfile: z
      .object({
        declaredLevel: levelSchema.nullable(),
        category: categorySchema.nullable(),
        rating: z.number().nullable(),
      })
      .nullable(),
  }),
  createdAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});
export const myInviteSchema = inviteSchema.extend({
  match: matchSummarySchema,
});
export type Invite = z.infer<typeof inviteSchema>;
export type MyInvite = z.infer<typeof myInviteSchema>;
export type InviteDirection = 'received' | 'sent';

const PAGE_LIMIT = 20;
const uuid = (id: string) => z.string().uuid().parse(id);
const invitesPath = (matchId: string) => `/v1/matches/${uuid(matchId)}/invites`;

export const inviteKeys = {
  all: ['private', 'invites'] as const,
  mine: (direction: InviteDirection, status?: InviteStatus) =>
    [...inviteKeys.all, 'mine', direction, status ?? 'all'] as const,
  forMatch: (matchId: string, status?: InviteStatus) =>
    [...inviteKeys.all, 'match', matchId, status ?? 'all'] as const,
};

export const myInvitesQuery = (
  direction: InviteDirection,
  status?: InviteStatus,
) =>
  infiniteQueryOptions({
    queryKey: inviteKeys.mine(direction, status),
    queryFn: ({ pageParam, signal }) =>
      apiRequest(
        'GET',
        '/v1/users/me/invites',
        pageSchema(myInviteSchema),
        undefined,
        {
          signal,
          params: { direction, status, limit: PAGE_LIMIT, cursor: pageParam },
        },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
// Convites de uma partida mudam pelas mãos dos convidados: mesmo ritmo de
// atualização do detalhe (foco + 15 s).
export const matchInvitesQuery = (matchId: string, status?: InviteStatus) =>
  queryOptions({
    queryKey: inviteKeys.forMatch(matchId, status),
    queryFn: async ({ signal }) =>
      (
        await apiRequest(
          'GET',
          invitesPath(matchId),
          pageSchema(inviteSchema),
          undefined,
          { signal, params: { status, limit: 50 } },
        )
      ).data,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
  });

const invite = apiEnvelope(inviteSchema);
export const sendInvite = (
  matchId: string,
  payload: { inviteeUserId: string; teamIndex?: TeamIndex; message?: string },
) => apiRequest('POST', invitesPath(matchId), invite, payload);
export const acceptInvite = (
  matchId: string,
  inviteId: string,
  payload: { teamIndex?: TeamIndex } = {},
) =>
  apiRequest(
    'POST',
    `${invitesPath(matchId)}/${uuid(inviteId)}/accept`,
    invite,
    payload,
  );
export const declineInvite = (matchId: string, inviteId: string) =>
  apiRequest(
    'POST',
    `${invitesPath(matchId)}/${uuid(inviteId)}/decline`,
    invite,
  );
export const cancelInvite = (matchId: string, inviteId: string) =>
  apiRequest(
    'POST',
    `${invitesPath(matchId)}/${uuid(inviteId)}/cancel`,
    invite,
  );
