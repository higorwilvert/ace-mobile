import { infiniteQueryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { pageSchema } from '@/features/matches/api';
import { apiRequest } from '@/lib/api-client';
import { apiEnvelope, publicUserSchema } from '@/types/api';

// Allowlists do contrato de T28 (rede social), portadas 1:1 do web: campo
// desconhecido é ignorado, campo ausente vira CONTRACT_ERROR.
export const friendRequestStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'CANCELLED',
]);
export const friendRequestSchema = z.object({
  id: z.string().uuid(),
  status: friendRequestStatusSchema,
  requester: publicUserSchema,
  addressee: publicUserSchema,
  createdAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable(),
});
export const friendSchema = z.object({
  user: publicUserSchema,
  since: z.string().datetime(),
});
export type FriendRequest = z.infer<typeof friendRequestSchema>;
export type Friend = z.infer<typeof friendSchema>;
export type RequestDirection = 'received' | 'sent';

const PAGE_LIMIT = 20;
const uuid = (id: string) => z.string().uuid().parse(id);

export const friendKeys = {
  all: ['private', 'friends'] as const,
  list: (userId: string) => [...friendKeys.all, 'list', userId] as const,
  requests: (direction: RequestDirection) =>
    [...friendKeys.all, 'requests', direction] as const,
};

/** Amigos próprios (`'me'`) ou de outro jogador (a API devolve 403 em perfil privado). */
export const friendsQuery = (userId: string | 'me') =>
  infiniteQueryOptions({
    queryKey: friendKeys.list(userId),
    queryFn: ({ pageParam, signal }) =>
      apiRequest(
        'GET',
        userId === 'me'
          ? '/v1/users/me/friends'
          : `/v1/users/${uuid(userId)}/friends`,
        pageSchema(friendSchema),
        undefined,
        {
          signal,
          auth: userId === 'me' ? 'required' : 'optional',
          params: { limit: PAGE_LIMIT, cursor: pageParam },
        },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

/** Só pedidos pendentes: a API não devolve os já decididos. */
export const friendRequestsQuery = (direction: RequestDirection) =>
  infiniteQueryOptions({
    queryKey: friendKeys.requests(direction),
    queryFn: ({ pageParam, signal }) =>
      apiRequest(
        'GET',
        '/v1/users/me/friend-requests',
        pageSchema(friendRequestSchema),
        undefined,
        {
          signal,
          params: { direction, limit: PAGE_LIMIT, cursor: pageParam },
        },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

const request = apiEnvelope(friendRequestSchema);
const requestPath = (id: string) => `/v1/friend-requests/${uuid(id)}`;
export const sendFriendRequest = (userId: string) =>
  apiRequest('POST', `/v1/users/${uuid(userId)}/friend-requests`, request);
export const acceptFriendRequest = (id: string) =>
  apiRequest('POST', `${requestPath(id)}/accept`, request);
export const declineFriendRequest = (id: string) =>
  apiRequest('POST', `${requestPath(id)}/decline`, request);
export const cancelFriendRequest = (id: string) =>
  apiRequest('POST', `${requestPath(id)}/cancel`, request);
export const removeFriend = (userId: string) =>
  apiRequest('DELETE', `/v1/users/me/friends/${uuid(userId)}`, z.void());
