import { api } from '@/lib/api-client';
import { sessionToken } from '@/lib/token';
import {
  makeAvailability,
  makePlayerProfile,
  makePublicProfile,
  makeSearchItem,
  makeSession,
  makeUser,
} from '@/test/fixtures';

import {
  deactivateAccount,
  deletePlayerProfile,
  playerProfileQuery,
  saveAvailability,
  savePlayerProfile,
  searchPlayersQuery,
  setVisibility,
  updateUser,
  userSearchItemSchema,
} from './api';

const ok = (data: unknown, status = 200) => ({ status, data: { data } });
const item0 = 'abababab-abab-4bab-8bab-abababababab';

describe('players api', () => {
  beforeEach(async () => {
    await sessionToken.set('a'.repeat(43), makeSession().expiresAt);
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await sessionToken.clear();
  });

  it('updateUser converte vazio em null e faz PATCH em /v1/users/me', async () => {
    const spy = jest.spyOn(api, 'request').mockResolvedValue(ok(makeUser()));
    await updateUser({
      fullName: 'Ana Clara Souza',
      gender: '',
      state: 'SC',
      city: 'Florianópolis',
      phone: '',
      avatarUrl: '',
      bio: '',
      dominantHand: 'RIGHT',
    });
    expect(spy.mock.calls[0][0]).toMatchObject({
      method: 'PATCH',
      url: '/v1/users/me',
      data: {
        fullName: 'Ana Clara Souza',
        gender: null,
        state: 'SC',
        city: 'Florianópolis',
        phone: null,
        avatarUrl: null,
        bio: null,
        dominantHand: 'RIGHT',
      },
    });
  });

  it('updateUser aceita só os extras do onboarding', async () => {
    const spy = jest.spyOn(api, 'request').mockResolvedValue(ok(makeUser()));
    await updateUser({
      phone: '48999990000',
      avatarUrl: '',
      bio: 'Oi',
      dominantHand: '',
    });
    expect(spy.mock.calls[0][0].data).toEqual({
      phone: '48999990000',
      avatarUrl: null,
      bio: 'Oi',
      dominantHand: null,
    });
  });

  it('setVisibility envia só profileVisibility', async () => {
    const spy = jest.spyOn(api, 'request').mockResolvedValue(ok(makeUser()));
    await setVisibility('PRIVATE');
    expect(spy.mock.calls[0][0]).toMatchObject({
      method: 'PATCH',
      url: '/v1/users/me',
      data: { profileVisibility: 'PRIVATE' },
    });
  });

  it('savePlayerProfile cria com POST e edita com PATCH no id', async () => {
    const profile = makePlayerProfile();
    const spy = jest.spyOn(api, 'request').mockResolvedValue(ok(profile, 201));
    const body = {
      sportId: 1,
      categoryCode: 'C',
      preferredSide: 'RIGHT' as const,
      yearsPracticing: null,
      playFrequencyWeek: null,
      isPrincipal: true,
    };
    await savePlayerProfile(body);
    expect(spy.mock.calls[0][0]).toMatchObject({
      method: 'POST',
      url: '/v1/users/me/sport-profiles',
      data: body,
    });
    await savePlayerProfile(body, profile.id);
    expect(spy.mock.calls[1][0]).toMatchObject({
      method: 'PATCH',
      url: `/v1/users/me/sport-profiles/${profile.id}`,
    });
  });

  it('saveAvailability envia o contrato de janela', async () => {
    const window = makeAvailability();
    const spy = jest.spyOn(api, 'request').mockResolvedValue(ok(window, 201));
    await saveAvailability({
      dayOfWeek: 1,
      startTime: '19:00',
      endTime: '21:00',
      timeZone: 'America/Sao_Paulo',
    });
    expect(spy.mock.calls[0][0]).toMatchObject({
      method: 'POST',
      url: '/v1/users/me/availability',
      data: {
        dayOfWeek: 1,
        startTime: '19:00',
        endTime: '21:00',
        timeZone: 'America/Sao_Paulo',
      },
    });
  });

  it('deletePlayerProfile e deactivateAccount usam DELETE e aceitam 204', async () => {
    const spy = jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 204, data: '' });
    await expect(deletePlayerProfile('abc')).resolves.toBeUndefined();
    expect(spy.mock.calls[0][0]).toMatchObject({
      method: 'DELETE',
      url: '/v1/users/me/sport-profiles/abc',
    });
    await expect(deactivateAccount()).resolves.toBeUndefined();
    expect(spy.mock.calls[1][0]).toMatchObject({
      method: 'DELETE',
      url: '/v1/users/me',
    });
  });

  it('playerProfileQuery busca o perfil público sem exigir sessão', async () => {
    const profile = makePublicProfile();
    const spy = jest.spyOn(api, 'request').mockResolvedValue(ok(profile));
    await sessionToken.clear();
    const options = playerProfileQuery(profile.id);
    await expect(
      options.queryFn?.({ signal: new AbortController().signal } as never),
    ).resolves.toEqual(profile);
    expect(spy.mock.calls[0][0].url).toBe(`/v1/users/${profile.id}/profile`);
    expect(spy.mock.calls[0][0].headers).not.toHaveProperty('Authorization');
  });

  it('searchPlayersQuery só habilita com duas letras e manda q, sportId e limit', async () => {
    expect(searchPlayersQuery(' a ').enabled).toBe(false);
    const item = makeSearchItem();
    const spy = jest
      .spyOn(api, 'request')
      .mockResolvedValue(ok([{ ...item, email: 'x@y.z' }]));
    const options = searchPlayersQuery('br', 2);
    expect(options.enabled).toBe(true);
    await expect(
      options.queryFn?.({ signal: new AbortController().signal } as never),
    ).resolves.toEqual([item]);
    expect(spy.mock.calls[0][0]).toMatchObject({
      method: 'GET',
      url: '/v1/users',
      params: { q: 'br', sportId: 2, limit: 30 },
    });
  });

  it('userSearchItemSchema descarta e-mail e mantém modalidades e relação (T28)', () => {
    const item = makeSearchItem({
      profileVisibility: 'PRIVATE',
      relationship: { status: 'REQUEST_SENT', requestId: item0, since: null },
    });
    const parsed = userSearchItemSchema.parse({ ...item, email: 'x@y.z' });
    expect(parsed).toEqual(item);
    expect(parsed).not.toHaveProperty('email');
    expect(
      userSearchItemSchema.safeParse({ ...item, relationship: undefined })
        .success,
    ).toBe(false);
  });
});
