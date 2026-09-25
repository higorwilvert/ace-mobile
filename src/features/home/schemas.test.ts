import {
  makeFeed,
  makeHome,
  makeMatchResult,
  makeRecommendedPlayer,
  makeUser,
  otherPlayer,
} from '@/test/fixtures';

import { feedSchema, homeSchema } from './api';
import {
  activityLine,
  generatedLabel,
  isKindError,
  kindErrors,
  mergeFeed,
  noticeOf,
  noticeText,
  pendingCount,
  refreshKey,
  teamLabel,
  withGeneration,
} from './schemas';

const home = homeSchema.parse(makeHome());
const feed = feedSchema.parse(makeFeed());
const failure = { error: { code: 'X', message: 'Cadastre sua agenda' } };
const bruno = otherPlayer.fullName.split(' ')[0];

describe('Início como feed (T38)', () => {
  it('aceita o contrato da API, inclusive erro por tipo', () => {
    expect(home.suggestions?.players?.total).toBe(8);
    expect(feedSchema.parse(makeFeed({ matches: failure })).matches).toEqual(
      failure,
    );
  });

  it('conta pendências e trata disponibilidade ausente como uma', () => {
    expect(pendingCount(home.pending)).toBe(6);
    expect(pendingCount({ ...home.pending, availability: false })).toBe(7);
  });

  it('nomeia times pelo primeiro nome, com "Você" primeiro', () => {
    const me = home.nextMatch!.teams[0].players[0];
    expect(teamLabel([otherPlayer, me], makeUser().id)).toBe(`Você e ${bruno}`);
    expect(teamLabel([otherPlayer])).toBe(bruno);
  });

  it('descreve resultado de amigos com vencedor, empate e placar', () => {
    const item = home.friendActivity[0];
    expect(activityLine(item)).toEqual({
      title: `${bruno} venceu Camila`,
      score: '6-4 · 6-3',
    });
    expect(
      activityLine({
        ...item,
        result: makeMatchResult({ winnerTeamIndex: 2 }),
      }),
    ).toEqual({ title: `Camila venceu ${bruno}`, score: '4-6 · 3-6' });
    expect(
      activityLine({
        ...item,
        result: makeMatchResult({ isDraw: true, winnerTeamIndex: null }),
      }).title,
    ).toBe(`${bruno} empatou com Camila`);
  });

  it('rótulo relativo da geração', () => {
    const now = new Date('2026-09-24T12:00:00.000Z');
    expect(generatedLabel('2026-09-24T11:59:40.000Z', now)).toBe('agora');
    expect(generatedLabel('2026-09-24T09:00:00.000Z', now)).toBe('há 3 h');
    expect(generatedLabel('2026-09-23T09:00:00.000Z', now)).toBe('ontem');
  });

  it('aviso só conta tipos gerados agora e ignora erros', () => {
    expect(noticeOf(feed)).toEqual({
      sportId: feed.sportId,
      players: 1,
      matches: 1,
    });
    expect(noticeOf({ ...feed, generated: [] })).toBeNull();
    expect(noticeOf({ ...feed, players: failure })).toEqual({
      sportId: feed.sportId,
      players: 0,
      matches: 1,
    });
    expect(noticeText({ sportId: 1, players: 8, matches: 4 }, 'Padel')).toEqual(
      {
        title: 'Há 12 sugestões novas para você',
        detail: '8 jogadores e 4 partidas de Padel',
      },
    );
  });

  it('erros por tipo e refresh no bloco de sugestões', () => {
    expect(kindErrors({ ...feed, matches: failure })).toEqual({
      matches: 'Cadastre sua agenda',
    });
    const five = Array.from({ length: 5 }, (_, i) =>
      makeRecommendedPlayer({ rank: i + 1 }),
    );
    const merged = mergeFeed(
      { ...home, suggestions: { ...home.suggestions!, stale: true } },
      makeFeed({
        players: { ...makeFeed().players, data: five } as Parameters<
          typeof mergeFeed
        >[1]['players'],
      }),
    );
    expect(merged.suggestions?.stale).toBe(false);
    expect(merged.suggestions?.players?.data).toHaveLength(3);
    expect(merged.suggestions?.players?.total).toBe(5);
    expect(mergeFeed(home, { ...feed, sportId: 999 })).toBe(home);
  });

  it('chave do refresh proativo: um por snapshot velho, nenhum quando fresco', () => {
    const stale = {
      ...home,
      suggestions: { ...home.suggestions!, stale: true },
    };
    expect(refreshKey(home)).toBeNull();
    expect(refreshKey({ ...home, suggestions: null })).toBeNull();
    const key = refreshKey(stale);
    expect(key).toEqual(expect.any(String));
    expect(refreshKey(structuredClone(stale))).toBe(key);
    const players = stale.suggestions.players!;
    const newer = {
      ...stale,
      suggestions: {
        ...stale.suggestions,
        players: {
          ...players,
          meta: {
            ...players.meta,
            generationId: 'abababab-abab-4bab-8bab-abababababab',
          },
        },
      },
    };
    expect(refreshKey(newer)).not.toBe(key);
    expect(
      refreshKey({
        ...stale,
        suggestions: { ...stale.suggestions, players: null },
      }),
    ).toEqual(expect.any(String));
  });

  it('geração explícita substitui só o tipo dela', () => {
    if (isKindError(feed.players)) throw new Error('fixture');
    const meta = {
      ...feed.players.meta,
      generationId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    };
    const next = withGeneration(feed, {
      kind: 'players',
      data: feed.players.data,
      meta,
    });
    expect(next.players).toEqual({ data: feed.players.data, meta });
    expect(next.matches).toBe(feed.matches);
  });
});
