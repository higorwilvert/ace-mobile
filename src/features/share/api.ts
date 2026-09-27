import { queryOptions } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import { z } from 'zod';

import { env } from '@/config/env';
import { apiRequest } from '@/lib/api-client';
import { sessionToken } from '@/lib/token';
import { apiEnvelope } from '@/types/api';

export const shareInfoSchema = z.object({
  kind: z.enum(['INVITE', 'RESULT']),
  url: z.string().url().nullable(),
  text: z.string(),
  photos: z.array(z.object({ id: z.string().uuid(), url: z.string() })),
});
export type ShareKind = z.infer<typeof shareInfoSchema>['kind'];

export const shareInfoQuery = (matchId: string) =>
  queryOptions({
    queryKey: ['private', 'share', matchId],
    queryFn: async ({ signal }) =>
      (
        await apiRequest(
          'GET',
          `/v1/matches/${matchId}/share`,
          apiEnvelope(shareInfoSchema),
          undefined,
          { signal },
        )
      ).data,
    staleTime: 30_000,
  });

export const cardUrl = (matchId: string, photoId: string | null) =>
  `${env.API_URL}/v1/matches/${matchId}/card?format=story${
    photoId ? `&photoId=${photoId}` : ''
  }`;

export function authHeaders(): Record<string, string> {
  const token = sessionToken.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Baixa o PNG para o cache: a folha nativa compartilha um arquivo local. */
export function downloadCard(matchId: string, photoId: string | null) {
  return File.downloadFileAsync(
    cardUrl(matchId, photoId),
    new File(Paths.cache, `ace-${matchId}.png`),
    { headers: authHeaders(), idempotent: true },
  );
}

/** Mesma regra da API e do web. */
export function shareKind(
  match: {
    result: unknown;
    visibility: string;
    status: string;
    scheduledAt: string;
  },
  now = Date.now(),
): ShareKind | null {
  if (match.result) return 'RESULT';
  return match.visibility === 'PUBLIC' &&
    match.status === 'OPEN' &&
    new Date(match.scheduledAt).getTime() > now
    ? 'INVITE'
    : null;
}
