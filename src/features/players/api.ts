import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/lib/api-client';
import {
  apiEnvelope,
  type Availability,
  availabilitySchema,
  type PlayerProfile,
  playerProfileSchema,
  type ProfileVisibility,
  profileVisibilitySchema,
  type PublicProfile,
  publicProfileSchema,
  publicUserSchema,
  relationshipSchema,
  sportSchema,
  type User,
  userSchema,
} from '@/types/api';

import type {
  AvailabilityPayload,
  PersonalExtrasValues,
  PersonalValues,
  ProfilePayload,
} from './schemas';

/** Vazio no formulário vira `null` no contrato (limpa o campo na API). */
const blankToNull = <T extends Record<string, string>>(values: T) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      value === '' ? null : value,
    ]),
  ) as { [K in keyof T]: T[K] | null };

export async function updateUser(
  values: PersonalValues | PersonalExtrasValues,
): Promise<User> {
  const { data } = await apiRequest(
    'PATCH',
    '/v1/users/me',
    apiEnvelope(userSchema),
    blankToNull(values),
  );
  return data;
}

export async function setVisibility(
  profileVisibility: ProfileVisibility,
): Promise<User> {
  const { data } = await apiRequest(
    'PATCH',
    '/v1/users/me',
    apiEnvelope(userSchema),
    { profileVisibility },
  );
  return data;
}

// O RN aceita `{ uri, name, type }` como parte multipart; o axios não fixa
// Content-Type para FormData, então o boundary vem do runtime.
export async function uploadAvatar(asset: {
  uri: string;
  mimeType: string;
}): Promise<User> {
  const body = new FormData();
  body.append('file', {
    uri: asset.uri,
    name: 'avatar.jpg',
    type: asset.mimeType,
  } as unknown as Blob);
  const { data } = await apiRequest(
    'PUT',
    '/v1/users/me/avatar',
    apiEnvelope(userSchema),
    body,
  );
  return data;
}

export async function deleteAvatar(): Promise<User> {
  const { data } = await apiRequest(
    'DELETE',
    '/v1/users/me/avatar',
    apiEnvelope(userSchema),
  );
  return data;
}

export function deactivateAccount(): Promise<void> {
  return apiRequest('DELETE', '/v1/users/me', z.void());
}

// `GET /v1/sports` é aberto, mas a chave fica sob `private` para ser limpa
// junto com a sessão como as demais.
export const sportsQuery = queryOptions({
  queryKey: ['private', 'sports'],
  queryFn: async ({ signal }) =>
    (
      await apiRequest(
        'GET',
        '/v1/sports',
        apiEnvelope(z.array(sportSchema)),
        undefined,
        { public: true, signal },
      )
    ).data,
  staleTime: 60 * 60_000,
});

export const profilesQuery = queryOptions({
  queryKey: ['private', 'sport-profiles'],
  queryFn: async ({ signal }) =>
    (
      await apiRequest(
        'GET',
        '/v1/users/me/sport-profiles',
        apiEnvelope(z.array(playerProfileSchema)),
        undefined,
        { signal },
      )
    ).data,
});

/**
 * Ou o corpo completo (criar/editar), ou só a promoção a principal — a API
 * aceita PATCH parcial e rebaixa o principal anterior na mesma transação.
 */
export async function savePlayerProfile(
  body: ProfilePayload | { isPrincipal: true },
  id?: string,
): Promise<PlayerProfile> {
  const { data } = await apiRequest(
    id ? 'PATCH' : 'POST',
    id ? `/v1/users/me/sport-profiles/${id}` : '/v1/users/me/sport-profiles',
    apiEnvelope(playerProfileSchema),
    body,
  );
  return data;
}

export function deletePlayerProfile(id: string): Promise<void> {
  return apiRequest('DELETE', `/v1/users/me/sport-profiles/${id}`, z.void());
}

export const availabilityQuery = queryOptions({
  queryKey: ['private', 'availability'],
  queryFn: async ({ signal }) =>
    (
      await apiRequest(
        'GET',
        '/v1/users/me/availability',
        apiEnvelope(z.array(availabilitySchema)),
        undefined,
        { signal },
      )
    ).data,
});

export async function saveAvailability(
  body: AvailabilityPayload,
  id?: string,
): Promise<Availability> {
  const { data } = await apiRequest(
    id ? 'PATCH' : 'POST',
    id ? `/v1/users/me/availability/${id}` : '/v1/users/me/availability',
    apiEnvelope(availabilitySchema),
    body,
  );
  return data;
}

export function deleteAvailability(id: string): Promise<void> {
  return apiRequest('DELETE', `/v1/users/me/availability/${id}`, z.void());
}

export const playerProfileQuery = (userId: string) =>
  queryOptions({
    queryKey: ['private', 'player', userId],
    queryFn: async ({ signal }): Promise<PublicProfile> =>
      (
        await apiRequest(
          'GET',
          `/v1/users/${userId}/profile`,
          apiEnvelope(publicProfileSchema),
          undefined,
          { auth: 'optional', signal },
        )
      ).data,
    enabled: Boolean(userId),
  });

// Contrato de `GET /v1/users?q=` (T28): além do jogador, as modalidades com
// perfil ativo (visíveis mesmo em perfil privado) e a relação com quem busca.
export const userSearchItemSchema = publicUserSchema.extend({
  profileVisibility: profileVisibilitySchema,
  sports: z.array(
    z.object({ id: z.number().int(), slug: z.string(), name: z.string() }),
  ),
  relationship: relationshipSchema,
});
export type UserSearchItem = z.infer<typeof userSearchItemSchema>;

const SEARCH_LIMIT = 30;
// Busca é top-N (typeahead) e só faz sentido a partir de duas letras; o
// resultado anterior fica na tela enquanto o próximo termo carrega.
export const searchPlayersQuery = (term: string, sportId?: number) =>
  queryOptions({
    queryKey: ['private', 'search', term.trim(), sportId ?? 'all'],
    queryFn: async ({ signal }) =>
      (
        await apiRequest(
          'GET',
          '/v1/users',
          apiEnvelope(z.array(userSearchItemSchema)),
          undefined,
          { params: { q: term.trim(), sportId, limit: SEARCH_LIMIT }, signal },
        )
      ).data,
    enabled: term.trim().length >= 2,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
