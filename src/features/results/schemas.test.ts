import { makeMatchDetail, otherPlayer } from '@/test/fixtures';

import {
  deriveOutcome,
  describeOutcome,
  historySearchSchema,
  MAX_SETS,
  outcomeLabels,
  ratingDeltaLabel,
  ratingNumber,
  resultFormSchema,
  resultPayload,
  scoreline,
  teamName,
} from './schemas';

const set = (team1: number, team2: number, tiebreak?: [number, number]) => ({
  team1: String(team1),
  team2: String(team2),
  tiebreak: tiebreak
    ? { team1: String(tiebreak[0]), team2: String(tiebreak[1]) }
    : null,
});
const names = (index: 1 | 2) => (index === 1 ? 'Ana Souza' : 'Bruno Lima');
const issuesOf = (value: unknown) => {
  const parsed = resultFormSchema.safeParse(value);
  return parsed.success
    ? []
    : parsed.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
};

describe('deriveOutcome', () => {
  it('vence quem ganha mais sets; empate quando dividem', () => {
    expect(
      deriveOutcome([
        { team1: 6, team2: 4 },
        { team1: 6, team2: 3 },
      ]),
    ).toEqual({
      setsWon: { team1: 2, team2: 0 },
      winnerTeamIndex: 1,
      isDraw: false,
    });
    expect(
      deriveOutcome([
        { team1: 4, team2: 6 },
        { team1: 6, team2: 7 },
        { team1: 7, team2: 5 },
      ]),
    ).toEqual({
      setsWon: { team1: 1, team2: 2 },
      winnerTeamIndex: 2,
      isDraw: false,
    });
    expect(
      deriveOutcome([
        { team1: 6, team2: 4 },
        { team1: 3, team2: 6 },
      ]),
    ).toEqual({
      setsWon: { team1: 1, team2: 1 },
      winnerTeamIndex: null,
      isDraw: true,
    });
    expect(deriveOutcome([])).toEqual({
      setsWon: { team1: 0, team2: 0 },
      winnerTeamIndex: null,
      isDraw: true,
    });
  });
});

describe('resultFormSchema', () => {
  it('aceita sets com tiebreak coerente e converte os textos em números', () => {
    const parsed = resultFormSchema.safeParse({
      sets: [set(6, 4), set(6, 7, [5, 7]), set(7, 5)],
      notes: '  Jogo duro  ',
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.sets[1]).toEqual({
      team1: 6,
      team2: 7,
      tiebreak: { team1: 5, team2: 7 },
    });
    expect(parsed.data.notes).toBe('Jogo duro');
  });
  it('recusa set empatado no segundo placar do set', () => {
    expect(issuesOf({ sets: [set(6, 4), set(6, 6)], notes: '' })).toEqual([
      { path: 'sets.1.team2', message: 'Um set não pode terminar empatado' },
    ]);
  });
  it('recusa tiebreak empatado ou vencido pelo outro time', () => {
    expect(issuesOf({ sets: [set(7, 6, [7, 7])], notes: '' })).toEqual([
      {
        path: 'sets.0.tiebreak',
        message: 'O tiebreak precisa ter o mesmo vencedor do set',
      },
    ]);
    expect(issuesOf({ sets: [set(7, 6, [5, 7])], notes: '' })).toEqual([
      {
        path: 'sets.0.tiebreak',
        message: 'O tiebreak precisa ter o mesmo vencedor do set',
      },
    ]);
  });
  it('exige de 1 a 7 sets e placares inteiros de 0 a 99', () => {
    expect(issuesOf({ sets: [], notes: '' })).toEqual([
      { path: 'sets', message: 'Informe ao menos um set' },
    ]);
    expect(
      issuesOf({
        sets: Array.from({ length: MAX_SETS + 1 }, () => set(6, 4)),
        notes: '',
      }),
    ).toEqual([{ path: 'sets', message: `No máximo ${MAX_SETS} sets` }]);
    expect(issuesOf({ sets: [set(100, 4)], notes: '' })).toEqual([
      { path: 'sets.0.team1', message: 'Use no máximo 99' },
    ]);
    expect(
      issuesOf({
        sets: [{ team1: '6.5', team2: '4', tiebreak: null }],
        notes: '',
      }),
    ).toEqual([{ path: 'sets.0.team1', message: 'Use números inteiros' }]);
    expect(
      issuesOf({
        sets: [{ team1: '', team2: '4', tiebreak: null }],
        notes: '',
      }),
    ).toEqual([{ path: 'sets.0.team1', message: 'Informe o placar' }]);
    expect(issuesOf({ sets: [set(-1, 4)], notes: '' })).toEqual([
      { path: 'sets.0.team1', message: 'Use zero ou mais' },
    ]);
  });
});

describe('resultPayload', () => {
  const parse = (value: unknown) => resultFormSchema.parse(value);
  it('manda o vencedor explícito derivado dos sets, sem isDraw', () => {
    expect(
      resultPayload(
        parse({ sets: [set(6, 4), set(6, 7, [5, 7]), set(7, 5)], notes: '' }),
      ),
    ).toEqual({
      sets: [
        { team1: 6, team2: 4 },
        { team1: 6, team2: 7, tiebreak: { team1: 5, team2: 7 } },
        { team1: 7, team2: 5 },
      ],
      winnerTeamIndex: 1,
    });
  });
  it('manda isDraw quando os sets dividem, com as notas aparadas', () => {
    expect(
      resultPayload(
        parse({ sets: [set(6, 4), set(3, 6)], notes: ' Empate justo ' }),
      ),
    ).toEqual({
      sets: [
        { team1: 6, team2: 4 },
        { team1: 3, team2: 6 },
      ],
      isDraw: true,
      notes: 'Empate justo',
    });
  });
});

describe('rótulos', () => {
  it('escreve o placar de qualquer perspectiva, tiebreak entre parênteses', () => {
    expect(
      scoreline([
        { a: 6, b: 4 },
        { a: 6, b: 7, tiebreak: { a: 5, b: 7 } },
        { a: 7, b: 5, tiebreak: null },
      ]),
    ).toBe('6-4 · 6-7 (5-7) · 7-5');
    expect(
      scoreline([
        { a: 4, b: 6 },
        { a: 7, b: 6, tiebreak: { a: 7, b: 5 } },
      ]),
    ).toBe('4-6 · 7-6 (7-5)');
  });
  it('descreve o desfecho com os nomes dos times e a contagem de sets', () => {
    expect(
      describeOutcome(
        { setsWon: { team1: 2, team2: 1 }, winnerTeamIndex: 1, isDraw: false },
        names,
      ),
    ).toBe('Ana Souza vence por 2 sets a 1');
    expect(
      describeOutcome(
        { setsWon: { team1: 0, team2: 1 }, winnerTeamIndex: 2, isDraw: false },
        names,
      ),
    ).toBe('Bruno Lima vence por 1 set a 0');
    expect(
      describeOutcome(
        {
          setsWon: { team1: 1, team2: 1 },
          winnerTeamIndex: null,
          isDraw: true,
        },
        names,
      ),
    ).toBe('Empate: 1 set a 1');
    expect(outcomeLabels).toEqual({
      WIN: 'Vitória',
      LOSS: 'Derrota',
      DRAW: 'Empate',
    });
  });
  it('em 1v1 o time é a pessoa; em 2v2 (ou vazio) é "Time n"', () => {
    const doubles = makeMatchDetail();
    expect(teamName(doubles, 1)).toBe('Time 1');
    const singles = makeMatchDetail({ teamSize: 1 });
    singles.teams[1].participants.push({
      id: '99999999-9999-4999-8999-999999999999',
      user: otherPlayer,
      isCreator: false,
      joinedAt: '2026-09-12T13:00:00.000Z',
    });
    expect(teamName(singles, 1)).toBe('Ana Clara Souza');
    expect(teamName(singles, 2)).toBe('Bruno Lima');
  });
  it('formata rating e variação em pt-BR sem Intl', () => {
    expect(ratingNumber(1512.34)).toBe('1.512,3');
    expect(ratingNumber(-8)).toBe('-8,0');
    expect(
      ratingDeltaLabel({
        ratingBefore: 1500,
        ratingAfter: 1512.3,
        rdBefore: 300,
        rdAfter: 250,
        volatilityBefore: 0.06,
        volatilityAfter: 0.06,
        algorithmVersion: 'glicko2-v1',
        processedAt: '2026-09-20T12:00:00.000Z',
      }),
    ).toBe('+12,3');
  });
});

describe('historySearchSchema', () => {
  it('mantém sportId numérico e userId uuid; descarta o resto', () => {
    expect(historySearchSchema.parse({ sportId: '3' })).toEqual({
      sportId: 3,
      userId: undefined,
    });
    expect(
      historySearchSchema.parse({
        sportId: 'x',
        userId: '44444444-4444-4444-8444-444444444444',
      }),
    ).toEqual({
      sportId: undefined,
      userId: '44444444-4444-4444-8444-444444444444',
    });
    expect(historySearchSchema.parse({ userId: 'me' })).toEqual({
      sportId: undefined,
      userId: undefined,
    });
  });
});
