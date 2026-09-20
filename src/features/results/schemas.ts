import { z } from 'zod';

import type { MatchDetail, TeamIndex } from '@/features/matches/api';
import { plainText } from '@/lib/input-schemas';

import type { Outcome, RatingChange, ResultPayload } from './api';

// ---------------------------------------------------------------- rótulos
export const outcomeLabels: Record<Outcome, string> = {
  WIN: 'Vitória',
  LOSS: 'Derrota',
  DRAW: 'Empate',
};

// ------------------------------------------------------------- formulário
// Limites do contrato de T09: 1..7 sets, placares inteiros 0..99, set nunca
// empatado, tiebreak opcional com o mesmo vencedor do set. O formato por
// modalidade (6 games, 11 pontos…) não é validado — decisão registrada na API.
export const MAX_SETS = 7;
export const MAX_SCORE = 99;
// Campo vazio vira `undefined` antes da coerção: `Number('')` seria 0.
const scoreInput = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? value.trim() === ''
        ? undefined
        : value.trim()
      : value,
  z.coerce
    .number({ message: 'Informe o placar' })
    .int('Use números inteiros')
    .min(0, 'Use zero ou mais')
    .max(MAX_SCORE, `Use no máximo ${MAX_SCORE}`),
);
const setInput = z.object({
  team1: scoreInput,
  team2: scoreInput,
  tiebreak: z.object({ team1: scoreInput, team2: scoreInput }).nullable(),
});
export const resultFormSchema = z
  .object({
    sets: z
      .array(setInput)
      .min(1, 'Informe ao menos um set')
      .max(MAX_SETS, `No máximo ${MAX_SETS} sets`),
    notes: plainText({ min: 0, max: 1000 }),
  })
  .superRefine((value, ctx) => {
    value.sets.forEach((set, index) => {
      if (set.team1 === set.team2) {
        ctx.addIssue({
          code: 'custom',
          path: ['sets', index, 'team2'],
          message: 'Um set não pode terminar empatado',
        });
        return;
      }
      if (!set.tiebreak) return;
      const setWinner = set.team1 > set.team2 ? 1 : 2;
      const tiebreakWinner =
        set.tiebreak.team1 === set.tiebreak.team2
          ? null
          : set.tiebreak.team1 > set.tiebreak.team2
            ? 1
            : 2;
      if (tiebreakWinner !== setWinner)
        ctx.addIssue({
          code: 'custom',
          path: ['sets', index, 'tiebreak'],
          message: 'O tiebreak precisa ter o mesmo vencedor do set',
        });
    });
  });
export type ResultFormInput = z.infer<typeof resultFormSchema>;
/** Valores como o formulário os guarda (strings dos inputs). */
export type SetFormValues = {
  team1: string;
  team2: string;
  tiebreak: { team1: string; team2: string } | null;
};
export const emptySet = (): SetFormValues => ({
  team1: '',
  team2: '',
  tiebreak: null,
});

// -------------------------------------------------------------- desfecho
export type DerivedOutcome = {
  setsWon: { team1: number; team2: number };
  winnerTeamIndex: TeamIndex | null;
  isDraw: boolean;
};
/**
 * Vencedor = time com mais sets ganhos; empate = sets iguais. É a regra que
 * a API (e o trigger do banco) impõe: derivar aqui evita pedir ao usuário um
 * desfecho que a API recusaria.
 */
export function deriveOutcome(
  sets: { team1: number; team2: number }[],
): DerivedOutcome {
  const setsWon = { team1: 0, team2: 0 };
  for (const set of sets) {
    if (set.team1 > set.team2) setsWon.team1 += 1;
    else if (set.team2 > set.team1) setsWon.team2 += 1;
  }
  const isDraw = setsWon.team1 === setsWon.team2;
  return {
    setsWon,
    winnerTeamIndex: isDraw ? null : setsWon.team1 > setsWon.team2 ? 1 : 2,
    isDraw,
  };
}
/** Payload explícito do RF23: exatamente um entre `winnerTeamIndex` e `isDraw`. */
export function resultPayload(values: ResultFormInput): ResultPayload {
  const sets = values.sets.map((set) => ({
    team1: set.team1,
    team2: set.team2,
    ...(set.tiebreak ? { tiebreak: set.tiebreak } : {}),
  }));
  const outcome = deriveOutcome(sets);
  return {
    sets,
    ...(outcome.isDraw
      ? { isDraw: true as const }
      : { winnerTeamIndex: outcome.winnerTeamIndex! }),
    ...(values.notes ? { notes: values.notes } : {}),
  };
}
const plural = (n: number) => (n === 1 ? 'set' : 'sets');
export function describeOutcome(
  outcome: DerivedOutcome,
  teamName: (index: TeamIndex) => string,
) {
  const { team1, team2 } = outcome.setsWon;
  if (outcome.isDraw) return `Empate: ${team1} ${plural(team1)} a ${team2}`;
  const winner = outcome.winnerTeamIndex!;
  const [won, lost] = winner === 1 ? [team1, team2] : [team2, team1];
  return `${teamName(winner)} vence por ${won} ${plural(won)} a ${lost}`;
}
export function teamPlayers(match: MatchDetail, teamIndex: TeamIndex) {
  const team = match.teams.find((t) => t.teamIndex === teamIndex);
  return (team?.participants ?? []).map((p) => p.user.fullName);
}
/** Em 1v1 o time é a própria pessoa; em 2v2, "Time n". */
export function teamName(match: MatchDetail, teamIndex: TeamIndex) {
  const players = teamPlayers(match, teamIndex);
  return match.teamSize === 1 && players[0] ? players[0] : `Time ${teamIndex}`;
}

// ---------------------------------------------------------------- placar
export type ScoreSet = {
  a: number;
  b: number;
  tiebreak?: { a: number; b: number } | null;
};
/** "6-4 · 6-7 (5-7) · 7-5", de qualquer perspectiva (a = lado de quem lê). */
export function scoreline(sets: ScoreSet[]) {
  return sets
    .map(
      (set) =>
        `${set.a}-${set.b}${set.tiebreak ? ` (${set.tiebreak.a}-${set.tiebreak.b})` : ''}`,
    )
    .join(' · ');
}

// ---------------------------------------------------------------- rating
export const ratingDelta = (change: RatingChange) =>
  change.ratingAfter - change.ratingBefore;
/** "1.512,3" — sem `Intl`, que o Hermes não garante em pt-BR no Android. */
export function ratingNumber(value: number) {
  const [int, dec] = Math.abs(value).toFixed(1).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 ? '-' : ''}${grouped},${dec}`;
}
/** "+12,3" / "-8,0" para a pill do histórico. */
export const ratingDeltaLabel = (change: RatingChange) => {
  const delta = ratingDelta(change);
  return `${delta > 0 ? '+' : ''}${ratingNumber(delta)}`;
};

// ---------------------------------------------------------- search params
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  schema.optional().catch(undefined);
export const historySearchSchema = z.object({
  sportId: optional(z.coerce.number().int().positive()),
  userId: optional(z.string().uuid()),
});
export type HistorySearch = z.infer<typeof historySearchSchema>;
