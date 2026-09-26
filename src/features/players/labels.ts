import type { Gender, GenderPolicy, Sport, SportCategory } from '@/types/api';

export const genderLabels = {
  MALE: 'Masculino',
  FEMALE: 'Feminino',
  NON_BINARY: 'Não binário',
  NOT_SPECIFIED: 'Prefiro não informar',
} as const;

export const handLabels = {
  RIGHT: 'Destro',
  LEFT: 'Canhoto',
  AMBI: 'Ambidestro',
} as const;

export const sideLabels = {
  RIGHT: 'Direita',
  LEFT: 'Esquerda',
  BOTH: 'Os dois lados',
} as const;

const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));
export const genderOptions = toOptions(genderLabels);
export const handOptions = toOptions(handLabels);
export const sideOptions = toOptions(sideLabels);

export const dayLabels = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

export const categoryOptions = (sport: Sport | undefined) =>
  [...(sport?.categories ?? [])]
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((category) => ({ value: category.code, label: category.label }));

/** "Simples e duplas", "O jogo é em dupla" ou "O jogo é individual". */
export const formatLabel = (sport: Sport) =>
  sport.supportsSingles && sport.supportsDoubles
    ? 'Simples e duplas'
    : sport.supportsDoubles
      ? 'O jogo é em dupla'
      : 'O jogo é individual';

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;
export const yearsLabel = (years: number) => plural(years, 'ano', 'anos');
export const frequencyLabel = (times: number) =>
  `${plural(times, 'vez', 'vezes')} por semana`;

// ---- Partidas (T30): composição e faixa de categorias, como no web.
export const policyLabels: Record<GenderPolicy, string> = {
  MALE: 'Masculina',
  FEMALE: 'Feminina',
  MIXED: 'Mista',
  OPEN: 'Composição livre',
};
export const categoryLabel = (profile: { category?: SportCategory | null }) =>
  profile.category?.label ?? 'Categoria a definir';
export function categoryRange(
  sport: Pick<Sport, 'categories'>,
  min: string | null,
  max: string | null,
) {
  const label = (code: string) =>
    sport.categories.find((c) => c.code === code)?.label ??
    'Categoria indisponível';
  if (!min && !max) return 'Todas as categorias';
  if (min && max)
    return min === max ? label(min) : `${label(min)} a ${label(max)}`;
  return min ? `A partir de ${label(min)}` : `Até ${label(max!)}`;
}
/** Composições que o criador pode escolher: o próprio gênero, mista (só 2v2) e livre. */
export function availablePolicies(gender: Gender | null, teamSize: number) {
  const allowed: GenderPolicy[] = [];
  if (gender === 'MALE' || gender === 'FEMALE') {
    allowed.push(gender);
    if (teamSize === 2) allowed.push('MIXED');
  }
  allowed.push('OPEN');
  return allowed.map((value) => ({ value, label: policyLabels[value] }));
}
