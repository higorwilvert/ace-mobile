import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { Href } from 'expo-router';
import { z } from 'zod';

import { pageSchema } from '@/features/matches/api';
import { apiRequest } from '@/lib/api-client';

// Contrato de T41: título e texto chegam prontos da API; `target` diz para
// onde o toque leva (lista, push e web usam a mesma regra).
export const targetSchema = z.object({
  kind: z.enum(['match', 'player', 'friend-requests']),
  id: z.string().nullable(),
});
export type NotificationTarget = z.infer<typeof targetSchema>;
export const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  target: targetSchema,
  actor: z
    .object({
      id: z.string(),
      fullName: z.string(),
      avatarUrl: z.string().nullable(),
    })
    .nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AppNotification = z.infer<typeof notificationSchema>;

export const notificationKeys = { all: ['private', 'notifications'] as const };

export const unreadCountQuery = queryOptions({
  queryKey: [...notificationKeys.all, 'unread'],
  queryFn: ({ signal }) =>
    apiRequest(
      'GET',
      '/v1/notifications/unread-count',
      z.object({ count: z.number() }),
      undefined,
      { signal },
    ).then((res) => res.count),
  // O push invalida na hora; o polling cobre quem negou a permissão.
  refetchInterval: 60_000,
  refetchOnWindowFocus: true,
});

export const notificationsQuery = infiniteQueryOptions({
  queryKey: [...notificationKeys.all, 'list'],
  queryFn: ({ pageParam, signal }) =>
    apiRequest(
      'GET',
      '/v1/notifications',
      pageSchema(notificationSchema),
      undefined,
      { signal, params: { limit: 20, cursor: pageParam } },
    ),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  refetchOnWindowFocus: true,
});

export const markRead = (id: string) =>
  apiRequest(
    'POST',
    `/v1/notifications/${encodeURIComponent(id)}/read`,
    z.void(),
  );
export const markAllRead = () =>
  apiRequest('POST', '/v1/notifications/read-all', z.void());
export const registerPushDevice = (
  token: string,
  platform: 'ios' | 'android',
) =>
  apiRequest('PUT', '/v1/notifications/push-devices', z.void(), {
    token,
    platform,
  });

export function targetHref({ kind, id }: NotificationTarget): Href | null {
  if (kind === 'friend-requests') return '/players?view=requests';
  if (!id) return null;
  return kind === 'player' ? `/players/${id}` : `/matches/${id}`;
}
