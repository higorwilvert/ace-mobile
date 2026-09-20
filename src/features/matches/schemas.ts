import { z } from 'zod';

import { dayLabels } from '@/features/players/labels';
import { plainText } from '@/lib/input-schemas';
import { isUf, UFS } from '@/lib/locations';
import {
  type GenderPolicy,
  genderPolicySchema,
  type PlayerProfile,
  type Sport,
  type User,
} from '@/types/api';

import {
  type InviteStatus,
  inviteStatusSchema,
  type MatchDetail,
  type MatchStatus,
  matchStatusSchema,
  type MatchSummary,
  type MatchVisibility,
  type ParticipantStatus,
  participantStatusSchema,
  type TeamIndex,
} from './api';

// ---------------------------------------------------------------- rótulos
export const matchStatusLabels: Record<MatchStatus, string> = {
  DRAFT: 'Rascunho',
  OPEN: 'Aberta',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Encerrada',
  CANCELLED: 'Cancelada',
};
export const participantStatusLabels: Record<ParticipantStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmada',
  DECLINED: 'Recusada',
  REMOVED: 'Removida',
};
export const visibilityLabels: Record<MatchVisibility, string> = {
  PUBLIC: 'Pública',
  PRIVATE: 'Privada',
};
export const formatShort = (teamSize: number) =>
  teamSize === 1 ? '1v1' : '2v2';
export const formatLabel = (teamSize: number) =>
  teamSize === 1 ? '1v1 · Simples' : '2v2 · Duplas';
export const durations = [45, 60, 90, 120, 150, 180] as const;
export function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${minutes} min`;
  if (!rest) return hours === 1 ? '1 hora' : `${hours} horas`;
  return `${hours}h${String(rest).padStart(2, '0')}`;
}
/**
 * Rótulo de situação para listas: uma partida confirmada cujo horário já
 * passou está esperando o placar (RF23), não "confirmada".
 */
export function matchStatusLabel(
  match: { status: MatchStatus; scheduledAt: string },
  now = new Date(),
) {
  return match.status === 'CONFIRMED' &&
    new Date(match.scheduledAt).getTime() <= now.getTime()
    ? 'Aguardando placar'
    : matchStatusLabels[match.status];
}
export const matchTitle = (match: {
  title: string | null;
  sport: { name: string };
  teamSize: number;
}) => match.title ?? `${match.sport.name} · ${formatShort(match.teamSize)}`;
export const placeLabel = (
  match: Pick<MatchSummary, 'arena' | 'locationText'>,
) => match.arena?.name ?? match.locationText ?? 'Local a combinar';

// ------------------------------------------------------------------ datas
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const MONTHS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];
const MONTHS_LONG = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
const pad = (n: number) => String(n).padStart(2, '0');
const clock = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** "Sáb, 19 set" (ano só quando difere do atual). */
export function formatDay(d: Date, now = new Date()) {
  const year =
    d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}${year}`;
}
/** "Sáb, 19 set · 18:00" (ano só quando difere do atual). */
export function formatWhen(iso: string, now = new Date()) {
  const d = new Date(iso);
  return `${formatDay(d, now)} · ${clock(d)}`;
}
/** "Sábado, 19 de setembro · 18:00–19:30". */
export function formatWhenLong(iso: string, durationMinutes: number) {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return `${dayLabels[start.getDay()]}, ${start.getDate()} de ${MONTHS_LONG[start.getMonth()]} · ${clock(start)}–${clock(end)}`;
}
export const dateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data');
export const timeInput = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe o horário');
/** Data e hora locais do formulário → instante ISO (ou null se inválido). */
export function toScheduledAt(date: string, time: string): string | null {
  if (!dateInput.safeParse(date).success || !timeInput.safeParse(time).success)
    return null;
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const value = new Date(y, m - 1, d, hh, mm, 0, 0);
  // `new Date` rola meses/dias inválidos (13/45) em vez de falhar.
  const rolled =
    value.getFullYear() !== y ||
    value.getMonth() !== m - 1 ||
    value.getDate() !== d ||
    value.getHours() !== hh ||
    value.getMinutes() !== mm;
  return Number.isNaN(value.getTime()) || rolled ? null : value.toISOString();
}
export function fromScheduledAt(iso: string) {
  const d = new Date(iso);
  return { date: dayKey(d), time: clock(d) };
}
export function todayInput(now = new Date(), plusDays = 0) {
  return dayKey(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + plusDays),
  );
}
/**
 * Opções do seletor de data: hoje e os próximos 59 dias. Uma data já
 * escolhida fora da janela (edição de partida antiga) entra no topo para o
 * seletor continuar mostrando o valor atual.
 */
export function dateOptions(now = new Date(), keep?: string) {
  const options = Array.from({ length: 60 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const prefix = i === 0 ? 'Hoje · ' : i === 1 ? 'Amanhã · ' : '';
    return { value: dayKey(d), label: `${prefix}${formatDay(d, now)}` };
  });
  if (keep && !options.some((o) => o.value === keep)) {
    const [y, m, d] = keep.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (!Number.isNaN(date.getTime()))
      options.unshift({ value: keep, label: formatDay(date, now) });
  }
  return options;
}
/** 06:00 às 23:00 de 15 em 15 min; `keep` preserva um horário fora da grade. */
export function timeOptions(keep?: string) {
  const options = Array.from({ length: 17 * 4 + 1 }, (_, i) => {
    const value = `${pad(6 + Math.floor(i / 4))}:${pad((i % 4) * 15)}`;
    return { value, label: value };
  });
  if (
    keep &&
    timeInput.safeParse(keep).success &&
    !options.some((o) => o.value === keep)
  )
    options.unshift({ value: keep, label: keep });
  return options;
}
export const durationOptions = durations.map((d) => ({
  value: String(d),
  label: durationLabel(d),
}));

// ------------------------------------------------------------- permissões
export type ViewerRole =
  | 'creator'
  | 'confirmed'
  | 'pending'
  | 'declined'
  | 'removed'
  | 'invited'
  | 'outsider';
export type MatchPermissions = {
  viewerRole: ViewerRole;
  canEdit: boolean;
  canPublish: boolean;
  canCancel: boolean;
  canManage: boolean;
  canChangeFormat: boolean;
  canApply: boolean;
  canWithdraw: boolean;
  /** Criador pode convidar: partida aberta, futura e com vaga (T08/T31). */
  canInvite: boolean;
  /** Observador tem convite pendente e ainda pode aceitá-lo (T31). */
  canAcceptInvite: boolean;
  /** Criador ou confirmado pode registrar o placar: `CONFIRMED` já passada (T31). */
  canRecordResult: boolean;
  /** Por que um membro ainda não pode registrar o placar (null quando pode ou não é membro). */
  resultBlockedReason: string | null;
  /** Por que o criador não pode editar/gerir agora (null quando pode). */
  lockedReason: string | null;
  /** Por que um terceiro não pode se candidatar (null quando pode). */
  applyBlockedReason: string | null;
};
const roleOf: Record<ParticipantStatus, ViewerRole> = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending',
  DECLINED: 'declined',
  REMOVED: 'removed',
};
/**
 * Única fonte das ações exibidas: só o que a API devolve em `viewer`,
 * `status`, `capacity` e `scheduledAt`. Portada literalmente do web.
 */
export function matchPermissions(
  match: MatchDetail,
  now = new Date(),
): MatchPermissions {
  const isCreator = match.viewer?.isCreator ?? false;
  const participation = match.viewer?.participation ?? null;
  const { status } = match;
  const future = new Date(match.scheduledAt).getTime() > now.getTime();
  const invite = match.viewer?.invite ?? null;
  const viewerRole: ViewerRole = isCreator
    ? 'creator'
    : participation
      ? roleOf[participation.status]
      : invite
        ? 'invited'
        : 'outsider';
  const joinable = status === 'OPEN' && future && match.capacity.available > 0;
  const canEdit = isCreator && (status === 'DRAFT' || status === 'OPEN');
  const canManage = isCreator && (status === 'OPEN' || status === 'CONFIRMED');
  const member = isCreator || participation?.status === 'CONFIRMED';
  const canRecordResult = member && status === 'CONFIRMED' && !future;
  const resultBlockedReason = !member
    ? null
    : status === 'CONFIRMED' && future
      ? 'O placar pode ser registrado depois do horário da partida.'
      : status === 'OPEN' || status === 'DRAFT'
        ? 'Os times ainda não estão completos.'
        : null;
  const lockedReason = !isCreator
    ? null
    : status === 'CANCELLED'
      ? 'Partida cancelada: nenhuma ação disponível.'
      : status === 'COMPLETED'
        ? 'Partida encerrada: o placar fica registrado no histórico.'
        : status === 'IN_PROGRESS'
          ? 'Partida em andamento: times e dados estão travados.'
          : status === 'CONFIRMED'
            ? 'Times completos: a edição está bloqueada, mas você ainda gerencia os jogadores.'
            : null;
  const canApply =
    !isCreator &&
    participation === null &&
    invite === null &&
    match.visibility === 'PUBLIC' &&
    joinable;
  const applyBlockedReason =
    isCreator || participation || invite || canApply
      ? null
      : status === 'CANCELLED'
        ? 'Esta partida foi cancelada.'
        : status === 'COMPLETED'
          ? 'Esta partida já aconteceu.'
          : status === 'IN_PROGRESS'
            ? 'Esta partida está em andamento.'
            : match.visibility === 'PRIVATE'
              ? 'Partida privada: a entrada é só por convite.'
              : !future
                ? 'O horário desta partida já passou.'
                : status === 'CONFIRMED' || match.capacity.available === 0
                  ? 'Os times já estão completos.'
                  : 'Esta partida não recebe candidaturas.';
  return {
    viewerRole,
    canEdit,
    canPublish: isCreator && status === 'DRAFT',
    canCancel: isCreator && status !== 'COMPLETED' && status !== 'CANCELLED',
    canManage,
    canChangeFormat: canEdit && match.capacity.confirmed <= 1,
    canApply,
    canWithdraw: participation?.status === 'PENDING',
    canInvite: isCreator && joinable,
    canAcceptInvite: invite !== null && participation === null && joinable,
    canRecordResult,
    resultBlockedReason,
    lockedReason,
    applyBlockedReason,
  };
}

// ------------------------------------------------------------- formulário
// Pickers e chips trabalham com string; a API espera número.
const numeric = z.union([z.string(), z.number()]).pipe(z.coerce.number());
export const matchFormSchema = (sports: Sport[], now = () => new Date()) =>
  z
    .object({
      sportId: numeric.pipe(
        z.number().int().positive('Escolha uma modalidade'),
      ),
      teamSize: numeric.pipe(
        z.union([z.literal(1), z.literal(2)], { message: 'Escolha o formato' }),
      ),
      date: dateInput,
      time: timeInput,
      durationMinutes: numeric.pipe(z.number().int().min(15).max(480)),
      state: z.string().refine((v): boolean => isUf(v), 'Selecione o estado'),
      city: plainText({
        min: 2,
        max: 100,
        requiredMessage: 'Selecione a cidade',
      }),
      locationText: plainText({
        min: 2,
        max: 255,
        requiredMessage: 'Informe o local da partida',
      }),
      title: plainText({ min: 0, max: 120 }).refine(
        (v) => v.length === 0 || v.length >= 3,
        'Use ao menos 3 caracteres no título',
      ),
      description: plainText({ min: 0, max: 2000 }),
      minCategoryCode: z.string(),
      maxCategoryCode: z.string(),
      visibility: z.enum(['PUBLIC', 'PRIVATE']),
      genderPolicy: z
        .union([genderPolicySchema, z.literal('')])
        .refine((v): boolean => v !== '', 'Escolha a composição da partida'),
    })
    .superRefine((value, ctx) => {
      const sport = sports.find((s) => s.id === value.sportId);
      if (!sport)
        ctx.addIssue({
          code: 'custom',
          path: ['sportId'],
          message: 'Escolha uma modalidade disponível',
        });
      else if (
        (value.teamSize === 1 && !sport.supportsSingles) ||
        (value.teamSize === 2 && !sport.supportsDoubles)
      )
        ctx.addIssue({
          code: 'custom',
          path: ['teamSize'],
          message: `${sport.name} não aceita o formato ${formatShort(value.teamSize)}`,
        });
      const scheduledAt = toScheduledAt(value.date, value.time);
      if (
        scheduledAt &&
        new Date(scheduledAt).getTime() < now().getTime() + 5 * 60_000
      )
        ctx.addIssue({
          code: 'custom',
          path: ['time'],
          message: 'Escolha um horário no futuro',
        });
      if (!scheduledAt)
        ctx.addIssue({
          code: 'custom',
          path: ['date'],
          message: 'Informe uma data e um horário válidos',
        });
      const min = sport?.categories.find(
        (c) => c.code === value.minCategoryCode,
      );
      const max = sport?.categories.find(
        (c) => c.code === value.maxCategoryCode,
      );
      for (const [key, category] of [
        ['minCategoryCode', min],
        ['maxCategoryCode', max],
      ] as const)
        if (value[key] && !category)
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: 'Escolha uma categoria desta modalidade',
          });
      if (min && max && min.ordinal > max.ordinal)
        ctx.addIssue({
          code: 'custom',
          path: ['maxCategoryCode'],
          message: 'A categoria máxima precisa ser igual ou acima da mínima',
        });
      if (value.genderPolicy === 'MIXED' && value.teamSize !== 2)
        ctx.addIssue({
          code: 'custom',
          path: ['genderPolicy'],
          message: 'Partidas mistas precisam ser em duplas',
        });
    });
export type MatchFormOutput = z.output<ReturnType<typeof matchFormSchema>>;
export type MatchFormValues = {
  sportId: number;
  teamSize: TeamIndex;
  date: string;
  time: string;
  durationMinutes: string;
  state: string;
  city: string;
  locationText: string;
  title: string;
  description: string;
  minCategoryCode: string;
  maxCategoryCode: string;
  visibility: MatchVisibility;
  genderPolicy: GenderPolicy | '';
};

export function matchFormDefaults({
  user,
  profiles,
  sports,
  match,
  now = new Date(),
}: {
  user: User;
  profiles: PlayerProfile[];
  sports: Sport[];
  match?: MatchDetail;
  now?: Date;
}): MatchFormValues {
  if (match) {
    const when = fromScheduledAt(match.scheduledAt);
    return {
      sportId: match.sportId,
      teamSize: match.teamSize,
      date: when.date,
      time: when.time,
      durationMinutes: String(match.durationMinutes),
      state: match.state,
      city: match.city,
      locationText: match.locationText ?? match.arena?.name ?? '',
      title: match.title ?? '',
      description: match.description ?? '',
      minCategoryCode: match.minCategoryCode ?? '',
      maxCategoryCode: match.maxCategoryCode ?? '',
      visibility: match.visibility,
      genderPolicy: match.genderPolicy,
    };
  }
  const principal = profiles.find((p) => p.isPrincipal) ?? profiles[0] ?? null;
  const sport = sports.find((s) => s.id === principal?.sportId) ?? null;
  return {
    sportId: sport?.id ?? 0,
    teamSize: (sport?.defaultTeamSize === 1 ? 1 : 2) as TeamIndex,
    date: todayInput(now, 1),
    time: '18:00',
    durationMinutes: '90',
    state: user.state,
    city: user.city,
    locationText: '',
    title: '',
    description: '',
    minCategoryCode: '',
    maxCategoryCode: '',
    visibility: 'PUBLIC',
    genderPolicy:
      user.gender === 'MALE' || user.gender === 'FEMALE' ? user.gender : '',
  };
}

export type MatchPayload = {
  minLevel?: null;
  maxLevel?: null;
  sportId?: number;
  teamSize?: number;
  scheduledAt?: string;
  durationMinutes?: number;
  visibility?: MatchVisibility;
  genderPolicy?: GenderPolicy;
  status?: 'OPEN' | 'DRAFT';
  title?: string | null;
  description?: string | null;
  minCategoryCode?: string | null;
  maxCategoryCode?: string | null;
  locationText?: string;
  city?: string;
  state?: string;
};
/**
 * Criação envia tudo; edição envia só o que mudou (a API aceita parcial e
 * recusa `sportId`/`teamSize` reenviados quando já há outros jogadores).
 */
export function matchPayload(
  values: MatchFormOutput,
  options: { status?: 'OPEN' | 'DRAFT'; original?: MatchDetail } = {},
): MatchPayload {
  const full: MatchPayload = {
    sportId: values.sportId,
    teamSize: values.teamSize,
    scheduledAt: toScheduledAt(values.date, values.time) ?? undefined,
    durationMinutes: values.durationMinutes,
    visibility: values.visibility,
    genderPolicy: genderPolicySchema.parse(values.genderPolicy),
    title: values.title || null,
    description: values.description || null,
    minCategoryCode: values.minCategoryCode || null,
    maxCategoryCode: values.maxCategoryCode || null,
    locationText: values.locationText,
    city: values.city,
    state: values.state,
  };
  const { original } = options;
  if (!original) return { ...full, status: options.status ?? 'OPEN' };
  const before: MatchPayload = {
    sportId: original.sportId,
    teamSize: original.teamSize,
    scheduledAt: original.scheduledAt,
    durationMinutes: original.durationMinutes,
    visibility: original.visibility,
    genderPolicy: original.genderPolicy,
    title: original.title,
    description: original.description,
    minCategoryCode: original.minCategoryCode,
    maxCategoryCode: original.maxCategoryCode,
    locationText: original.locationText ?? undefined,
    city: original.city,
    state: original.state,
  };
  const changed: MatchPayload = {};
  for (const key of Object.keys(full) as (keyof MatchPayload)[]) {
    const next = full[key];
    const prev = before[key];
    const same =
      key === 'scheduledAt' &&
      typeof next === 'string' &&
      typeof prev === 'string'
        ? new Date(next).getTime() === new Date(prev).getTime()
        : next === prev;
    if (!same) (changed as Record<string, unknown>)[key] = next;
  }
  // Faixa de nível legada: a edição migra a partida para categorias.
  if (original.minLevel || original.maxLevel) {
    changed.minLevel = null;
    changed.maxLevel = null;
  }
  return changed;
}

// ---------------------------------------------------------- search params
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  schema.optional().catch(undefined);
export const matchesSearchSchema = z.object({
  sportId: optional(z.coerce.number().int().positive()),
  teamSize: optional(
    z.coerce.number().pipe(z.union([z.literal(1), z.literal(2)])),
  ),
  state: optional(z.string().refine((v): boolean => isUf(v))),
  city: optional(z.string().min(2).max(100)),
  categoryCode: optional(z.string().min(1).max(30)),
  genderPolicy: optional(genderPolicySchema),
  dateFrom: optional(dateInput),
  dateTo: optional(dateInput),
});
export type MatchesSearch = z.infer<typeof matchesSearchSchema>;
export const activeFilterCount = (search: MatchesSearch) =>
  Object.values(search).filter((v) => v !== undefined).length;

export const mineViews = ['matches', 'applications', 'invites'] as const;
export const mineRoles = ['all', 'creator', 'participant'] as const;
export const mineBoxes = ['received', 'sent'] as const;
export const mineSearchSchema = z
  .object({
    view: z.enum(mineViews).catch('matches'),
    role: z.enum(mineRoles).catch('all'),
    box: z.enum(mineBoxes).catch('received'),
    status: optional(z.string()),
  })
  .transform((value) => {
    const status =
      value.view === 'matches'
        ? matchStatusSchema.safeParse(value.status)
        : value.view === 'applications'
          ? participantStatusSchema.safeParse(value.status)
          : inviteStatusSchema.safeParse(value.status);
    return {
      view: value.view,
      role: value.role,
      box: value.box,
      status: status.success ? status.data : undefined,
    };
  });
export type MineSearch = {
  view: (typeof mineViews)[number];
  role: (typeof mineRoles)[number];
  box: (typeof mineBoxes)[number];
  status?: MatchStatus | ParticipantStatus | InviteStatus;
};

export const UF_OPTIONS = UFS.map((uf) => ({ value: uf, label: uf }));
export const teamIndexes: TeamIndex[] = [1, 2];
