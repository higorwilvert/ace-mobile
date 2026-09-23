import { act, fireEvent, screen, within } from '@testing-library/react-native';

import { api } from '@/lib/api-client';
import {
  makeHistoryEntry,
  makePage,
  makePublicProfile,
  makeRelationship,
  makeTotals,
  makeUser,
} from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import { PublicProfileScreen } from './public-profile-screen';

const profile = makePublicProfile();
jest.mock('@/features/auth/session');
jest.mock('@/hooks/use-inbox-count', () => ({
  useInboxCount: () => ({
    friendRequests: 2,
    label: (count: number) => (count > 0 ? String(count) : undefined),
  }),
}));
const mockPush = jest.fn();
let mockFocus: (() => void) | undefined;
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({
    userId: '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
  }),
  useFocusEffect: (effect: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(() => {
      mockFocus = effect;
      effect();
    }, [effect]);
  },
}));

beforeEach(() => {
  mockPush.mockClear();
  mockFocus = undefined;
  seedToken();
  mockSession({ status: 'signed-in', user: makeUser() });
});
afterEach(() => jest.restoreAllMocks());

describe('PublicProfileScreen', () => {
  it('atualiza o perfil próprio ao voltar da edição', async () => {
    const me = makeUser();
    let profileLoads = 0;
    jest
      .spyOn(api, 'request')
      .mockImplementation((config: { url?: string }) => {
        const url = String(config.url);
        if (url.endsWith('/history/summary'))
          return Promise.resolve({
            status: 200,
            data: { data: [makeTotals()] },
          });
        if (url.endsWith('/history'))
          return Promise.resolve({ status: 200, data: makePage([]) });
        profileLoads += 1;
        return Promise.resolve({
          status: 200,
          data: {
            data: makePublicProfile({
              id: me.id,
              fullName: me.fullName,
              bio: profileLoads === 1 ? 'Bio anterior' : 'Bio atualizada',
            }),
          },
        });
      });
    renderWithQuery(<PublicProfileScreen userId={me.id} />);
    expect(await screen.findByText('Bio anterior')).toBeOnTheScreen();
    expect(profileLoads).toBe(1);
    act(() => mockFocus?.());
    expect(await screen.findByText('Bio atualizada')).toBeOnTheScreen();
    expect(profileLoads).toBe(2);
  });

  it('mostra carregando', () => {
    jest.spyOn(api, 'request').mockReturnValue(new Promise(() => {}));
    renderWithQuery(<PublicProfileScreen />);
    expect(screen.getByRole('progressbar')).toBeOnTheScreen();
  });

  it('mostra modalidade, categoria, rating e histórico (totais + últimas) de um perfil público', async () => {
    const spy = jest
      .spyOn(api, 'request')
      .mockImplementation((config: { url?: string }) => {
        const url = String(config.url);
        if (url.endsWith('/history/summary'))
          return Promise.resolve({
            status: 200,
            data: { data: [makeTotals()] },
          });
        if (url.endsWith('/history'))
          return Promise.resolve({
            status: 200,
            data: makePage([makeHistoryEntry()]),
          });
        return Promise.resolve({ status: 200, data: { data: profile } });
      });
    renderWithQuery(<PublicProfileScreen />);
    expect(await screen.findByText('Bruno Alves')).toBeOnTheScreen();
    expect(screen.getByText('Florianópolis · SC')).toBeOnTheScreen();
    expect(screen.getByText('Jogo desde 2019.')).toBeOnTheScreen();
    expect(screen.getByText(/Categoria C/)).toBeOnTheScreen();
    expect(screen.getByText('1512')).toBeOnTheScreen();
    // Totais vêm do histórico (RF25), não de player_ratings.
    expect(await screen.findByText('3 partidas')).toBeOnTheScreen();
    expect(screen.getByText('Vitória')).toBeOnTheScreen();
    expect(screen.getByText('6-4 · 6-3')).toBeOnTheScreen();
    expect(screen.queryByText('+12,3')).not.toBeOnTheScreen();
    expect(screen.getByText('Ver histórico completo')).toBeOnTheScreen();
    expect(screen.queryByText('Perfil privado')).not.toBeOnTheScreen();
    const urls = spy.mock.calls.map(([c]) => String(c.url));
    expect(urls).toContain(`/v1/users/${profile.id}/profile`);
    expect(urls).toContain(`/v1/users/${profile.id}/history/summary`);
  });

  it('esconde detalhes e histórico quando o perfil é restrito', async () => {
    jest.spyOn(api, 'request').mockResolvedValue({
      status: 200,
      data: {
        data: makePublicProfile({
          restricted: true,
          profileVisibility: 'PRIVATE',
          sportProfiles: [
            {
              sportId: 1,
              sport: profile.sportProfiles[0].sport,
              isPrincipal: true,
              declaredLevel: null,
              categoryCode: null,
              category: null,
              preferredSide: null,
              yearsPracticing: null,
              playFrequencyWeek: null,
              rating: null,
            },
          ],
          recentMatches: [],
        }),
      },
    });
    renderWithQuery(<PublicProfileScreen />);
    expect(await screen.findByText('Perfil privado')).toBeOnTheScreen();
    expect(screen.getByText('Padel')).toBeOnTheScreen();
    expect(screen.getByText(/só amigos veem/i)).toBeOnTheScreen();
    expect(screen.queryByText(/Categoria C/)).not.toBeOnTheScreen();
    expect(screen.queryByText('1512')).not.toBeOnTheScreen();
    expect(screen.queryByText('Histórico')).not.toBeOnTheScreen();
  });

  it('oferece "Convidar para partida" a outro jogador e abre a folha (T31)', async () => {
    jest
      .spyOn(api, 'request')
      .mockImplementation((config: { url?: string }) =>
        Promise.resolve(
          String(config.url) === '/v1/matches/mine'
            ? { status: 200, data: makePage([]) }
            : { status: 200, data: { data: profile } },
        ),
      );
    renderWithQuery(<PublicProfileScreen />);
    fireEvent.press(await screen.findByText('Convidar para partida'));
    expect(
      await screen.findByText('Convidar para qual partida?'),
    ).toBeOnTheScreen();
  });

  it('não oferece convite no próprio perfil (T31)', async () => {
    mockSession({
      status: 'signed-in',
      user: makeUser({ id: profile.id }),
    });
    jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 200, data: { data: profile } });
    renderWithQuery(<PublicProfileScreen />);
    await screen.findByText('Bruno Alves');
    expect(screen.queryByText('Convidar para partida')).not.toBeOnTheScreen();
  });

  it('mostra a relação, o hint e o pill de amigos que abre a lista (T33)', async () => {
    jest.spyOn(api, 'request').mockResolvedValue({
      status: 200,
      data: {
        data: makePublicProfile({
          relationship: makeRelationship({
            status: 'FRIENDS',
            since: new Date(2026, 8, 19, 12).toISOString(),
          }),
          friendsCount: 4,
        }),
      },
    });
    renderWithQuery(<PublicProfileScreen />);
    expect(
      await screen.findByLabelText('Amigos com Bruno Alves. Desfazer amizade'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Amigos desde 19/09/2026')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('link', { name: '4 amigos' }));
    expect(mockPush).toHaveBeenCalledWith(`/players/${profile.id}/friends`);
  });

  it('restrito e sem relação: pede amizade para ver o perfil completo (T33)', async () => {
    jest.spyOn(api, 'request').mockResolvedValue({
      status: 200,
      data: {
        data: makePublicProfile({
          restricted: true,
          profileVisibility: 'PRIVATE',
          relationship: makeRelationship(),
          friendsCount: 1,
          sportProfiles: [],
          recentMatches: [],
        }),
      },
    });
    renderWithQuery(<PublicProfileScreen />);
    expect(
      await screen.findByText(/Peça amizade para ver o perfil completo/),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeOnTheScreen();
    expect(screen.getByText('1 amigo')).toBeOnTheScreen();
    expect(
      screen.queryByRole('link', { name: '1 amigo' }),
    ).not.toBeOnTheScreen();
    // Convite continua disponível: não depende de amizade (T08/T28).
    expect(screen.getByText('Convidar para partida')).toBeOnTheScreen();
  });

  it('pedido recebido no perfil oferece Aceitar e Recusar (T33)', async () => {
    jest.spyOn(api, 'request').mockResolvedValue({
      status: 200,
      data: {
        data: makePublicProfile({
          relationship: makeRelationship({
            status: 'REQUEST_RECEIVED',
            requestId: 'abababab-abab-4bab-8bab-abababababab',
          }),
        }),
      },
    });
    renderWithQuery(<PublicProfileScreen />);
    expect(
      await screen.findByLabelText('Aceitar pedido de amizade de Bruno Alves'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Esta pessoa pediu sua amizade')).toBeOnTheScreen();
  });

  it('o próprio perfil não tem botão social nem convite (T33)', async () => {
    const me = makeUser();
    jest.spyOn(api, 'request').mockResolvedValue({
      status: 200,
      data: {
        data: makePublicProfile({
          id: me.id,
          fullName: me.fullName,
          relationship: makeRelationship({ status: 'SELF' }),
        }),
      },
    });
    renderWithQuery(<PublicProfileScreen />);
    expect(await screen.findByText('Ana Clara Souza')).toBeOnTheScreen();
    expect(screen.queryByText('Adicionar')).not.toBeOnTheScreen();
    expect(screen.queryByText('Convidar para partida')).not.toBeOnTheScreen();
    expect(screen.getByText('4 amigos')).toBeOnTheScreen();
  });

  it('no perfil próprio mostra jogadores, conta, badge de pedidos e rating', async () => {
    const me = makeUser();
    const spy = jest
      .spyOn(api, 'request')
      .mockImplementation((config: { url?: string }) => {
        const url = String(config.url);
        if (url.endsWith('/history/summary'))
          return Promise.resolve({
            status: 200,
            data: { data: [makeTotals()] },
          });
        if (url.endsWith('/history'))
          return Promise.resolve({ status: 200, data: makePage([]) });
        return Promise.resolve({
          status: 200,
          data: {
            data: makePublicProfile({ id: me.id, fullName: me.fullName }),
          },
        });
      });
    renderWithQuery(<PublicProfileScreen userId={me.id} />);
    const players = await screen.findByRole('button', {
      name: 'Jogadores e amigos',
    });
    expect(spy.mock.calls.map(([config]) => String(config.url))).toContain(
      `/v1/users/${me.id}/profile`,
    );
    expect(within(players).getByText('2')).toBeOnTheScreen();
    fireEvent.press(players);
    expect(mockPush).toHaveBeenCalledWith('/players');
    fireEvent.press(
      screen.getByRole('button', { name: 'Conta e configurações' }),
    );
    expect(mockPush).toHaveBeenCalledWith('/account');
    fireEvent.press(
      screen.getByRole('link', { name: 'Ver evolução do rating' }),
    );
    expect(mockPush).toHaveBeenCalledWith('/rating');
  });

  it('no perfil de outro jogador não mostra os atalhos próprios', async () => {
    jest
      .spyOn(api, 'request')
      .mockImplementation((config: { url?: string }) => {
        const url = String(config.url);
        if (url.endsWith('/history/summary'))
          return Promise.resolve({
            status: 200,
            data: { data: [makeTotals()] },
          });
        if (url.endsWith('/history'))
          return Promise.resolve({ status: 200, data: makePage([]) });
        return Promise.resolve({ status: 200, data: { data: profile } });
      });
    renderWithQuery(<PublicProfileScreen />);
    await screen.findByText('Modalidades');
    expect(screen.queryByLabelText('Jogadores e amigos')).toBeNull();
    expect(screen.queryByLabelText('Conta e configurações')).toBeNull();
    expect(screen.queryByText('Ver evolução do rating')).toBeNull();
    expect(screen.getByText('Convidar para partida')).toBeOnTheScreen();
  });

  it('mostra jogador indisponível em 404', async () => {
    jest.spyOn(api, 'request').mockRejectedValue(
      Object.assign(new Error('x'), {
        isAxiosError: true,
        response: { status: 404, data: { error: { code: 'USER_NOT_FOUND' } } },
      }),
    );
    renderWithQuery(<PublicProfileScreen />);
    expect(
      await screen.findByText('Este jogador não está disponível.'),
    ).toBeOnTheScreen();
  });
});
