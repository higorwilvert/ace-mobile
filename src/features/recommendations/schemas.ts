import { z } from 'zod';

import { toScheduledAt } from '@/features/matches/schemas';
import type { Gender, GenderPolicy, PlayerProfile, Sport } from '@/types/api';

import {
  type Factors,
  modeSchema,
  type RecommendationItem,
  type RecommendationKind,
  type RecommendationMeta,
  type RecommendationMode,
  type RecommendationRequest,
  type RecommendationResponse,
} from './api';

// Regras portadas literalmente de `my-base-app/src/features/recommendations/
// schemas.ts`: o ranking e o score são da API; aqui só rótulos, motivos e a
// validação do formulário (as mesmas recusas que a API faria).
export const factorOrder = [
  'level',
  'distance',
  'activity',
  'preferences',
] as const;
export const factorLabels: Record<keyof Factors, string> = {
  level: 'Nível de jogo',
  distance: 'Proximidade',
  activity: 'Atividade',
  preferences: 'Preferências',
};
export const modeLabels: Record<RecommendationMode, string> = {
  SAME_GENDER: 'Mesmo gênero',
  MIXED_PARTNER: 'Duplas mistas',
  OPEN: 'Composição livre',
};
export const kindLabels: Record<RecommendationKind, string> = {
  players: 'Jogadores',
  matches: 'Partidas',
};
export const limitOptions = [5, 10, 20, 50] as const;
export const DEFAULT_LIMIT = 10;
const MAX_DAYS_AHEAD = 14;

/** 0–1 → "82,5": uma casa, sem zero à direita, sem `Intl` (Hermes). */
export const formatScore = (value: number) =>
  String(Math.round(value * 1000) / 10).replace('.', ',');
/** Só evidência: o `totalScore` da API sempre manda na ordem e na exibição. */
export const reconstructScore = (factors: Factors, weights: Factors) =>
  factorOrder.reduce((total, key) => total + factors[key] * weights[key], 0);
/** Os dois fatores que mais contribuíram (`fator × peso`); empate segue a ordem do protocolo. */
export function recommendationReasons(
  item: Pick<RecommendationItem, 'scoreBreakdown' | 'distanceMethod'>,
  weights: Factors,
) {
  const descriptions: Record<keyof Factors, string> = {
    level: 'Compatibilidade de nível',
    distance:
      item.distanceMethod === 'CITY_STATE'
        ? 'Proximidade por cidade e estado'
        : 'Perto de você',
    activity: 'Atividade esportiva',
    preferences: 'Preferências de jogo',
  };
  return factorOrder
    .filter((key) => item.scoreBreakdown[key] > 0 && weights[key] > 0)
    .sort(
      (a, b) =>
        item.scoreBreakdown[b] * weights[b] -
        item.scoreBreakdown[a] * weights[a],
    )
    .slice(0, 2)
    .map((key) => descriptions[key]);
}
/** Composição da busca → política da partida oferecida no convite (portado do web). */
export function scopePolicy(
  mode: RecommendationMode,
  gender: Gender | null,
): GenderPolicy {
  if (mode === 'OPEN') return 'OPEN';
  if (mode === 'MIXED_PARTNER') return 'MIXED';
  return gender === 'MALE' || gender === 'FEMALE' ? gender : 'OPEN';
}

// ------------------------------------------------------------- formulário
export type RecommendationDraft = Record<
  | 'sportId'
  | 'teamSize'
  | 'mode'
  | 'limit'
  | 'date'
  | 'time'
  | 'endDate'
  | 'endTime'
  | 'durationMinutes',
  string
>;
export const defaultTeamSize = (sport: Sport) =>
  sport.defaultTeamSize === 1 ? '1' : '2';
/** Esporte principal (ou o primeiro), formato padrão da modalidade, mesmo gênero, 10 sugestões. */
export function defaultDraft(
  sports: Sport[],
  profiles: PlayerProfile[],
): RecommendationDraft | null {
  const principal = profiles.find((p) => p.isPrincipal) ?? profiles[0];
  const sport = sports.find((s) => s.id === principal?.sportId) ?? sports[0];
  if (!sport) return null;
  return {
    sportId: String(sport.id),
    teamSize: defaultTeamSize(sport),
    mode: 'SAME_GENDER',
    limit: String(DEFAULT_LIMIT),
    date: '',
    time: '',
    endDate: '',
    endTime: '',
    durationMinutes: '90',
  };
}
export function recommendationFormSchema(
  sports: Sport[],
  gender: Gender | null,
  kind: RecommendationKind,
  now = () => new Date(),
) {
  return z
    .object({
      sportId: z.coerce.number().int().positive(),
      teamSize: z.coerce.number().pipe(z.union([z.literal(1), z.literal(2)])),
      mode: modeSchema,
      limit: z.coerce.number().int().min(1).max(100),
      date: z.string(),
      time: z.string(),
      endDate: z.string(),
      endTime: z.string(),
      durationMinutes: z.coerce
        .number()
        .int()
        .min(15, 'Use no mínimo 15 minutos')
        .max(480, 'Use no máximo 480 minutos'),
    })
    .superRefine((v, ctx) => {
      const issue = (path: string, message: string) =>
        ctx.addIssue({ code: 'custom', path: [path], message });
      const sport = sports.find((s) => s.id === v.sportId);
      if (!sport) issue('sportId', 'Escolha uma modalidade do seu perfil');
      else if (
        (v.teamSize === 1 && !sport.supportsSingles) ||
        (v.teamSize === 2 && !sport.supportsDoubles)
      )
        issue('teamSize', 'Formato indisponível nesta modalidade');
      if (v.mode === 'SAME_GENDER' && (!gender || gender === 'NOT_SPECIFIED'))
        issue(
          'mode',
          'Informe seu gênero no perfil ou escolha composição livre',
        );
      if (
        v.mode === 'MIXED_PARTNER' &&
        (v.teamSize !== 2 || (gender !== 'MALE' && gender !== 'FEMALE'))
      )
        issue(
          'mode',
          'Duplas mistas exigem formato 2v2 e gênero masculino ou feminino no perfil',
        );
      const requested = !!(
        v.date ||
        v.time ||
        (kind === 'matches' && (v.endDate || v.endTime))
      );
      if (requested) {
        const start = toScheduledAt(v.date, v.time);
        if (!start)
          issue('date', 'Preencha data e horário válidos para o início');
        else if (new Date(start) <= now())
          issue('time', 'Escolha um horário futuro');
        if (kind === 'matches') {
          const end = toScheduledAt(v.endDate, v.endTime);
          if (!end)
            issue('endDate', 'Preencha data e horário válidos para o fim');
          else if (start && new Date(end) <= new Date(start))
            issue('endTime', 'O fim precisa ser depois do início');
          if (
            start &&
            new Date(start).getTime() >
              now().getTime() + MAX_DAYS_AHEAD * 86400000
          )
            issue('date', 'Busque nos próximos 14 dias');
        }
      }
    });
}
export type RecommendationFormValues = z.infer<
  ReturnType<typeof recommendationFormSchema>
>;
export function recommendationPayload(
  kind: RecommendationKind,
  v: RecommendationFormValues,
): RecommendationRequest {
  const base = {
    sportId: v.sportId,
    teamSize: v.teamSize,
    mode: v.mode,
    limit: v.limit,
  };
  const start = toScheduledAt(v.date, v.time);
  return {
    kind,
    body: {
      ...base,
      ...(start
        ? kind === 'players'
          ? { scheduledAt: start, durationMinutes: v.durationMinutes }
          : { dateFrom: start, dateTo: toScheduledAt(v.endDate, v.endTime)! }
        : {}),
    },
  };
}

// ------------------------------------------------------------------ textos
/** Nota de contexto do cabeçalho dos resultados (copy do web). */
export function contextNote(response: RecommendationResponse) {
  if (response.kind === 'players')
    return response.meta.scheduledAt === null
      ? 'Sem filtro de agenda. Combine o horário antes de convidar.'
      : 'Sem conflito com partidas já confirmadas no horário solicitado.';
  return 'Partidas públicas nos próximos 14 dias, sem conflito com suas partidas confirmadas.';
}
/** T48: distância entre pontos públicos (sede da cidade ou arena) e o raio usado. */
export function distanceNote(
  item: Pick<RecommendationItem, 'distanceMethod' | 'distanceKm'>,
  meta: Pick<RecommendationMeta, 'location'>,
) {
  if (item.distanceMethod === 'CITY_STATE' || item.distanceKm === null)
    return 'A proximidade foi estimada por cidade e estado; não representa distância em quilômetros.';
  const { city, radiusKm } = meta.location;
  const where =
    item.distanceKm === 0 ? `Em ${city}` : `≈ ${item.distanceKm} km de ${city}`;
  return `${where}, dentro do seu raio de busca de ${radiusKm} km. A distância é medida da sede da sua cidade; coordenadas pessoais não são usadas.`;
}
export type EmptyCopy = {
  title: string;
  description: string;
  cta: { label: string; href: '/personal' };
};
export function emptyCopy(response: RecommendationResponse): EmptyCopy {
  const { city, radiusKm } = response.meta.location;
  return {
    title: 'Nenhuma sugestão nesta busca',
    description:
      response.kind === 'players'
        ? `Ninguém compatível dentro de ${radiusKm} km de ${city}. As sugestões precisam de jogadores com perfil esportivo e rating utilizáveis, visíveis para você, compatíveis com a composição e que também aceitem essa distância.`
        : `Nenhuma partida elegível dentro de ${radiusKm} km de ${city}. Elas precisam ser públicas, futuras, com vaga, composição compatível e sem conflito com suas partidas confirmadas. Partidas que você organiza ou para as quais já se candidatou ficam de fora.`,
    cta: { label: 'Aumentar raio de busca', href: '/personal' },
  };
}
