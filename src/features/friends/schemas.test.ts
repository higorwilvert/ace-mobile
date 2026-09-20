import {
  friendAction,
  playersSearchSchema,
  requestDateLabel,
  shortDate,
  sinceLabel,
} from './schemas';

const base = { requestId: null, since: null };
const requestId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('friendAction', () => {
  it('deriva o único botão possível de cada estado da API', () => {
    expect(friendAction({ ...base, status: 'SELF' })).toEqual({
      kind: 'self',
      label: 'Você',
      hint: null,
    });
    expect(friendAction({ ...base, status: 'NONE' })).toEqual({
      kind: 'add',
      label: 'Adicionar',
      hint: null,
    });
    expect(
      friendAction({ status: 'REQUEST_SENT', requestId, since: null }),
    ).toEqual({
      kind: 'sent',
      label: 'Pedido enviado',
      hint: 'Aguardando resposta',
    });
    expect(
      friendAction({ status: 'REQUEST_RECEIVED', requestId, since: null }),
    ).toEqual({
      kind: 'received',
      label: 'Aceitar',
      hint: 'Esta pessoa pediu sua amizade',
    });
  });
  it('mostra desde quando são amigos, sem Intl', () => {
    const since = new Date(2026, 8, 19, 12).toISOString();
    expect(friendAction({ status: 'FRIENDS', requestId: null, since })).toEqual(
      {
        kind: 'friends',
        label: 'Amigos',
        hint: 'Amigos desde 19/09/2026',
      },
    );
    expect(friendAction({ ...base, status: 'FRIENDS' }).hint).toBe(
      'Vocês são amigos',
    );
  });
});

describe('playersSearchSchema', () => {
  it('tem padrões seguros e coage sportId', () => {
    expect(playersSearchSchema.parse({})).toEqual({
      view: 'search',
      q: '',
      sportId: undefined,
      box: 'received',
    });
    expect(
      playersSearchSchema.parse({
        view: 'requests',
        q: '  ana ',
        sportId: '2',
        box: 'sent',
      }),
    ).toEqual({ view: 'requests', q: 'ana', sportId: 2, box: 'sent' });
  });
  it('cai no padrão com valores inválidos', () => {
    expect(
      playersSearchSchema.parse({ view: 'x', sportId: 'abc', box: ['a'] }),
    ).toEqual({ view: 'search', q: '', sportId: undefined, box: 'received' });
  });
});

describe('datas', () => {
  const iso = new Date(2026, 8, 19, 12).toISOString();
  it('sinceLabel mostra mês e ano', () => {
    expect(sinceLabel(iso)).toBe('Desde set. 2026');
  });
  it('requestDateLabel muda o verbo pela caixa', () => {
    expect(requestDateLabel('received', iso)).toBe('Pediu em Sáb, 19 set');
    expect(requestDateLabel('sent', iso)).toBe('Enviado em Sáb, 19 set');
  });
  it('shortDate é dd/mm/aaaa', () => {
    expect(shortDate(iso)).toBe('19/09/2026');
  });
});
