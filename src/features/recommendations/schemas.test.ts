import {
  makeMatchRecommendations,
  makePlayerProfile,
  makePlayerRecommendations,
  makeRecommendedPlayer,
  makeSport,
} from '@/test/fixtures';

import {
  availabilityNote,
  defaultDraft,
  emptyCopy,
  formatScore,
  recommendationFormSchema,
  recommendationPayload,
  recommendationReasons,
  reconstructScore,
  scopePolicy,
} from './schemas';

const weights = {
  level: 0.5,
  distance: 0.25,
  activity: 0.15,
  preferences: 0.1,
};
const padel = makeSport(); // só duplas
const tenis = makeSport({
  id: 2,
  slug: 'tenis',
  name: 'Tênis',
  defaultTeamSize: 1,
  supportsSingles: true,
  supportsDoubles: true,
  requiresSidePreference: false,
});
const base = {
  sportId: '1',
  teamSize: '2',
  mode: 'SAME_GENDER',
  limit: '10',
  date: '',
  time: '',
  endDate: '',
  endTime: '',
  durationMinutes: '90',
};
const now = () => new Date('2026-09-20T12:00:00.000Z');

describe('recommendationReasons', () => {
  it('escolhe os dois fatores de maior contribuição fator × peso', () => {
    expect(
      recommendationReasons(
        {
          scoreBreakdown: {
            level: 0.8,
            distance: 0.6,
            activity: 0.2,
            preferences: 1,
          },
          distanceMethod: 'COORDINATES',
        },
        weights,
      ),
    ).toEqual(['Compatibilidade de nível', 'Proximidade geográfica']); // 0,40 · 0,15 · 0,03 · 0,10
  });
  it('ignora fator zero e rotula proximidade por cidade e estado', () => {
    expect(recommendationReasons(makeRecommendedPlayer(), weights)).toEqual([
      'Compatibilidade de nível',
      'Proximidade por cidade e estado',
    ]);
    expect(
      recommendationReasons(
        {
          scoreBreakdown: {
            level: 0,
            distance: 0,
            activity: 0.5,
            preferences: 0,
          },
          distanceMethod: 'CITY_STATE',
        },
        weights,
      ),
    ).toEqual(['Atividade esportiva']);
  });
  it('empate mantém a ordem do protocolo', () => {
    expect(
      recommendationReasons(
        {
          scoreBreakdown: {
            level: 0.2,
            distance: 0.4,
            activity: 1,
            preferences: 1,
          },
          distanceMethod: 'COORDINATES',
        },
        weights,
      ),
    ).toEqual(['Atividade esportiva', 'Compatibilidade de nível']); // 0,15 · 0,10 · 0,10 · 0,10
  });
});

describe('score', () => {
  it('reconstrói o total da API a partir do breakdown', () => {
    expect(
      reconstructScore(
        { level: 0.8, distance: 0.6, activity: 0.2, preferences: 1 },
        weights,
      ),
    ).toBeCloseTo(0.68, 6);
    expect(
      reconstructScore(makeRecommendedPlayer().scoreBreakdown, weights),
    ).toBeCloseTo(0.825, 6);
  });
  it('formata 0–1 como 0–100 com uma casa em pt-BR, sem Intl', () => {
    expect(formatScore(0.825)).toBe('82,5');
    expect(formatScore(1)).toBe('100');
    expect(formatScore(0.68)).toBe('68');
    expect(formatScore(0.123456)).toBe('12,3');
    expect(formatScore(0)).toBe('0');
  });
});

describe('scopePolicy', () => {
  it('traduz a composição da busca para a política do convite', () => {
    expect(scopePolicy('OPEN', 'MALE')).toBe('OPEN');
    expect(scopePolicy('MIXED_PARTNER', 'FEMALE')).toBe('MIXED');
    expect(scopePolicy('SAME_GENDER', 'MALE')).toBe('MALE');
    expect(scopePolicy('SAME_GENDER', 'FEMALE')).toBe('FEMALE');
    expect(scopePolicy('SAME_GENDER', 'NON_BINARY')).toBe('OPEN');
    expect(scopePolicy('SAME_GENDER', null)).toBe('OPEN');
  });
});

describe('defaultDraft', () => {
  it('parte do esporte principal com o formato padrão dele', () => {
    const profiles = [
      makePlayerProfile({
        id: '8f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e51',
        isPrincipal: false,
        sport: padel,
      }),
      makePlayerProfile({ isPrincipal: true, sport: tenis }),
    ];
    expect(defaultDraft([padel, tenis], profiles)).toEqual({
      ...base,
      sportId: '2',
      teamSize: '1',
    });
    expect(defaultDraft([], [])).toBeNull();
  });
});

describe('recommendationFormSchema', () => {
  const parse = (
    values: Partial<typeof base>,
    gender: 'FEMALE' | 'NON_BINARY' | null = 'FEMALE',
    kind: 'players' | 'matches' = 'players',
  ) =>
    recommendationFormSchema([padel, tenis], gender, kind, now).safeParse({
      ...base,
      ...values,
    });
  const issue = (r: ReturnType<typeof parse>) =>
    r.success ? null : String(r.error.issues[0].path[0]);
  it('aceita os padrões e converte para números', () => {
    const r = parse({});
    expect(r.success && r.data).toMatchObject({
      sportId: 1,
      teamSize: 2,
      mode: 'SAME_GENDER',
      limit: 10,
    });
  });
  it('recusa formato que a modalidade não suporta', () => {
    expect(issue(parse({ teamSize: '1' }))).toBe('teamSize');
    expect(parse({ sportId: '2', teamSize: '1' }).success).toBe(true);
  });
  it('mesmo gênero exige gênero no perfil; mista exige 2v2 e gênero binário', () => {
    expect(issue(parse({}, null))).toBe('mode');
    expect(parse({ mode: 'OPEN' }, null).success).toBe(true);
    expect(
      issue(parse({ sportId: '2', teamSize: '1', mode: 'MIXED_PARTNER' })),
    ).toBe('mode');
    expect(issue(parse({ mode: 'MIXED_PARTNER' }, 'NON_BINARY'))).toBe('mode');
    expect(parse({ mode: 'MIXED_PARTNER' }).success).toBe(true);
  });
  it('horário opcional precisa ser futuro; partidas exigem fim > início dentro de 14 dias', () => {
    expect(issue(parse({ date: '2026-09-19', time: '10:00' }))).toBe('time');
    expect(parse({ date: '2026-09-21', time: '10:00' }).success).toBe(true);
    expect(
      issue(
        parse(
          {
            date: '2026-09-21',
            time: '10:00',
            endDate: '2026-09-21',
            endTime: '09:00',
          },
          'FEMALE',
          'matches',
        ),
      ),
    ).toBe('endTime');
    expect(
      issue(
        parse(
          {
            date: '2026-10-10',
            time: '10:00',
            endDate: '2026-10-10',
            endTime: '12:00',
          },
          'FEMALE',
          'matches',
        ),
      ),
    ).toBe('date');
    expect(
      parse(
        {
          date: '2026-09-21',
          time: '10:00',
          endDate: '2026-09-21',
          endTime: '12:00',
        },
        'FEMALE',
        'matches',
      ).success,
    ).toBe(true);
  });
});

describe('recommendationPayload', () => {
  const values = recommendationFormSchema(
    [padel],
    'FEMALE',
    'players',
    now,
  ).parse(base);
  it('sem horário manda só os campos base', () => {
    expect(recommendationPayload('players', values)).toEqual({
      kind: 'players',
      body: { sportId: 1, teamSize: 2, mode: 'SAME_GENDER', limit: 10 },
    });
  });
  it('jogadores com horário mandam scheduledAt + duração; partidas mandam a janela', () => {
    const scheduled = {
      ...values,
      date: '2026-09-21',
      time: '10:00',
      endDate: '2026-09-21',
      endTime: '12:00',
    };
    const players = recommendationPayload('players', scheduled).body;
    expect(players.scheduledAt).toBe(
      new Date(2026, 8, 21, 10, 0).toISOString(),
    );
    expect(players.durationMinutes).toBe(90);
    expect(players).not.toHaveProperty('dateFrom');
    const matches = recommendationPayload('matches', scheduled).body;
    expect(matches.dateFrom).toBe(new Date(2026, 8, 21, 10, 0).toISOString());
    expect(matches.dateTo).toBe(new Date(2026, 8, 21, 12, 0).toISOString());
    expect(matches).not.toHaveProperty('scheduledAt');
  });
});

describe('textos por disponibilidade', () => {
  it('explica o contexto e o vazio conforme meta.availability', () => {
    const players = {
      kind: 'players' as const,
      ...makePlayerRecommendations(),
    };
    expect(availabilityNote(players)).toMatch(/Sem filtro de agenda/);
    expect(emptyCopy(players).cta.href).toBe('/sports');
    const unavailable = {
      kind: 'players' as const,
      ...makePlayerRecommendations([], { availability: 'TARGET_UNAVAILABLE' }),
    };
    expect(availabilityNote(unavailable)).toMatch(/não está disponível/);
    expect(emptyCopy(unavailable).cta.href).toBe('/availability');
    const noAgenda = {
      kind: 'matches' as const,
      ...makeMatchRecommendations([], { availability: 'NOT_CONFIGURED' }),
    };
    expect(emptyCopy(noAgenda)).toMatchObject({
      title: 'Cadastre sua disponibilidade para encontrar partidas',
      cta: { label: 'Cadastrar disponibilidade', href: '/availability' },
    });
    const matches = { kind: 'matches' as const, ...makeMatchRecommendations() };
    expect(availabilityNote(matches)).toMatch(/próximos 14 dias/);
    expect(emptyCopy(matches).title).toBe('Nenhuma sugestão nesta busca');
  });
});
