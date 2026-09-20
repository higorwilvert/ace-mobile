import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/lib/api-client';
import { plainText } from '@/lib/input-schemas';
import { apiEnvelope } from '@/types/api';

/** Unidades federativas brasileiras (siglas oficiais do IBGE). */
export const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;
export type Uf = (typeof UFS)[number];
export const isUf = (value: unknown): value is Uf =>
  typeof value === 'string' && (UFS as readonly string[]).includes(value);

/**
 * Municípios de uma UF, servidos pela API a partir do catálogo IBGE.
 * A lista é estável, então fica em cache pelo tempo de vida da sessão.
 */
export const citiesQuery = (uf: string) =>
  queryOptions({
    queryKey: ['locations', 'cities', uf],
    queryFn: async ({ signal }) =>
      (
        await apiRequest(
          'GET',
          `/v1/locations/states/${uf}/cities`,
          apiEnvelope(z.array(z.string())),
          undefined,
          { public: true, signal },
        )
      ).data,
    enabled: isUf(uf),
    staleTime: Infinity,
    gcTime: 60 * 60_000,
  });

const fold = (value: string) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
/** Busca tolerante a acentos e caixa: "florianopolis" encontra "Florianópolis". */
export const matchesCity = (city: string, search: string) =>
  fold(city).includes(fold(search.trim()));

export const locationShape = {
  state: z
    .string()
    .refine((value): boolean => isUf(value), 'Selecione seu estado'),
  city: plainText({
    min: 2,
    max: 100,
    requiredMessage: 'Selecione sua cidade',
  }),
};
