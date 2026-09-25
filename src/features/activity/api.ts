import {
  infiniteQueryOptions,
  queryOptions,
  type QueryClient,
} from '@tanstack/react-query';
import { z } from 'zod';

import {
  matchResultSchema,
  matchSummarySchema,
  pageSchema,
  teamIndexSchema,
} from '@/features/matches/api';
import { apiRequest } from '@/lib/api-client';
import { apiEnvelope, publicUserSchema } from '@/types/api';

// T36: fotos, curtidas, comentários e o feed de atividade (estilo Strava).
export const MAX_MATCH_PHOTOS = 6;

const count = z.number().int().min(0);
const photoSchema = z.object({
  id: z.string().uuid(),
  url: z.string(),
  uploadedBy: publicUserSchema,
  createdAt: z.string().datetime(),
  canDelete: z.boolean(),
});
const likeStateSchema = z.object({ likeCount: count, likedByMe: z.boolean() });
const activitySchema = likeStateSchema.extend({
  photos: z.array(photoSchema),
  commentCount: count,
  viewer: z
    .object({ canAddPhoto: z.boolean(), canInteract: z.boolean() })
    .nullable(),
});
const commentSchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  author: publicUserSchema,
  createdAt: z.string().datetime(),
  canDelete: z.boolean(),
});
const feedItemSchema = likeStateSchema.extend({
  match: matchSummarySchema,
  result: matchResultSchema,
  teams: z.array(
    z.object({
      teamIndex: teamIndexSchema,
      players: z.array(publicUserSchema),
    }),
  ),
  friendIds: z.array(z.string().uuid()),
  photos: z.array(photoSchema),
  commentCount: count,
});
export type MatchPhoto = z.infer<typeof photoSchema>;
export type MatchActivity = z.infer<typeof activitySchema>;
export type MatchComment = z.infer<typeof commentSchema>;
export type FeedItem = z.infer<typeof feedItemSchema>;
export type LikeState = z.infer<typeof likeStateSchema>;

export const activityKeys = {
  summary: (matchId: string) => ['private', 'activity', matchId] as const,
  comments: (matchId: string) =>
    ['private', 'activity', matchId, 'comments'] as const,
  feed: ['private', 'feed'] as const,
};

export const activityQuery = (matchId: string) =>
  queryOptions({
    queryKey: activityKeys.summary(matchId),
    queryFn: async ({ signal }) =>
      (
        await apiRequest(
          'GET',
          `/v1/matches/${matchId}/activity`,
          apiEnvelope(activitySchema),
          undefined,
          { signal },
        )
      ).data,
    staleTime: 30_000,
  });

export const commentsQuery = (matchId: string) =>
  infiniteQueryOptions({
    queryKey: activityKeys.comments(matchId),
    queryFn: ({ pageParam, signal }) =>
      apiRequest(
        'GET',
        `/v1/matches/${matchId}/comments`,
        pageSchema(commentSchema),
        undefined,
        { signal, params: { limit: 20, cursor: pageParam } },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    staleTime: 30_000,
  });

export const feedQuery = infiniteQueryOptions({
  queryKey: activityKeys.feed,
  queryFn: ({ pageParam, signal }) =>
    apiRequest('GET', '/v1/feed', pageSchema(feedItemSchema), undefined, {
      signal,
      params: { limit: 10, cursor: pageParam },
    }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  staleTime: 30_000,
});

/** Detalhe e feed mostram os mesmos números: qualquer escrita atualiza os dois. */
export const refreshActivity = (queryClient: QueryClient, matchId: string) =>
  Promise.all([
    queryClient.invalidateQueries({
      queryKey: activityKeys.summary(matchId),
    }),
    queryClient.invalidateQueries({ queryKey: activityKeys.feed }),
  ]);

// O RN aceita `{ uri, name, type }` como parte multipart (como o avatar).
export const uploadMatchPhoto = (
  matchId: string,
  asset: { uri: string; mimeType: string },
) => {
  const body = new FormData();
  body.append('file', {
    uri: asset.uri,
    name: 'foto.jpg',
    type: asset.mimeType,
  } as unknown as Blob);
  return apiRequest(
    'POST',
    `/v1/matches/${matchId}/photos`,
    apiEnvelope(photoSchema),
    body,
  );
};
export const deleteMatchPhoto = (matchId: string, photoId: string) =>
  apiRequest('DELETE', `/v1/matches/${matchId}/photos/${photoId}`, z.void());

export const setLike = async (matchId: string, liked: boolean) =>
  (
    await apiRequest(
      liked ? 'PUT' : 'DELETE',
      `/v1/matches/${matchId}/like`,
      apiEnvelope(likeStateSchema),
    )
  ).data;

export const addComment = (matchId: string, body: string) =>
  apiRequest(
    'POST',
    `/v1/matches/${matchId}/comments`,
    apiEnvelope(commentSchema),
    { body },
  );
export const deleteComment = (matchId: string, commentId: string) =>
  apiRequest(
    'DELETE',
    `/v1/matches/${matchId}/comments/${commentId}`,
    z.void(),
  );
