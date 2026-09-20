import { api } from '@/lib/api-client';
import {
  makeMatchRecommendations,
  makePlayerRecommendations,
} from '@/test/fixtures';
import { seedToken } from '@/test/session-mock';

import {
  generateRecommendations,
  matchRecommendationsSchema,
  playerRecommendationsSchema,
} from './api';

afterEach(() => jest.restoreAllMocks());

describe('contrato de recomendações', () => {
  it('descarta o que não está na allowlist (coordenadas, e-mail, snapshots)', () => {
    const raw = makePlayerRecommendations();
    const parsed = playerRecommendationsSchema.parse({
      ...raw,
      data: [
        {
          ...raw.data[0],
          player: {
            ...raw.data[0].player,
            email: 'b@exemplo.com',
            latitude: -27.59,
            longitude: -48.54,
          },
          snapshot: { rd: 350 },
        },
      ],
    });
    expect(parsed.data[0].player).toEqual(raw.data[0].player);
    expect(parsed.data[0]).not.toHaveProperty('snapshot');
  });
  it('recusa pesos que não somam 1 e score fora de [0,1]', () => {
    const raw = makePlayerRecommendations();
    expect(
      playerRecommendationsSchema.safeParse({
        ...raw,
        meta: {
          ...raw.meta,
          weights: { level: 0.5, distance: 0.5, activity: 0.5, preferences: 0 },
        },
      }).success,
    ).toBe(false);
    expect(
      playerRecommendationsSchema.safeParse({
        ...raw,
        data: [{ ...raw.data[0], totalScore: 1.2 }],
      }).success,
    ).toBe(false);
  });
  it('partidas: só OPEN/PUBLIC, com a política de vazio explícita', () => {
    const raw = makeMatchRecommendations();
    expect(matchRecommendationsSchema.parse(raw).meta.emptyMatchPolicy).toBe(
      'EXCLUDE_NO_ROSTER',
    );
    expect(
      matchRecommendationsSchema.safeParse({
        ...raw,
        data: [
          {
            ...raw.data[0],
            match: { ...raw.data[0].match, visibility: 'PRIVATE' },
          },
        ],
      }).success,
    ).toBe(false);
  });
  it('gera com POST no endpoint do tipo e devolve o kind junto', async () => {
    await seedToken();
    const spy = jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 201, data: makePlayerRecommendations() });
    const response = await generateRecommendations({
      kind: 'players',
      body: { sportId: 1, teamSize: 2, mode: 'OPEN', limit: 10 },
    });
    expect(response.kind).toBe('players');
    expect(response.data[0].rank).toBe(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/v1/recommendations/players',
        data: { sportId: 1, teamSize: 2, mode: 'OPEN', limit: 10 },
      }),
    );
  });
});
