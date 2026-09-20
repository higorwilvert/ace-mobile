import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/lib/api-client';
import {
  makeMatch,
  makeMyInvite,
  makePage,
  makePlayerProfile,
  makePublicProfile,
  makeSport,
  makeUser,
} from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import { HomeScreen } from './home-screen';

jest.mock('@/features/auth/session');
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  useFocusEffect: () => {},
}));

const mockProfiles = (
  profiles: unknown[],
  matches = [makeMatch()],
  invites: unknown[] = [],
  requests: unknown[] = [],
) =>
  jest
    .spyOn(api, 'request')
    .mockImplementation((config: { url?: string }) =>
      Promise.resolve(
        String(config.url) === '/v1/matches/mine'
          ? { status: 200, data: makePage(matches) }
          : String(config.url) === '/v1/users/me/invites'
            ? { status: 200, data: makePage(invites) }
            : String(config.url) === '/v1/users/me/friend-requests'
              ? { status: 200, data: makePage(requests) }
              : { status: 200, data: { data: profiles } },
      ),
    );

beforeEach(async () => {
  mockSession({ status: 'signed-in', user: makeUser() });
  await seedToken();
});
afterEach(() => jest.restoreAllMocks());

describe('HomeScreen', () => {
  it('cumprimenta pelo primeiro nome e não menciona mais o T24', async () => {
    mockProfiles([makePlayerProfile()]);
    renderWithQuery(<HomeScreen />);
    expect(screen.getByText('Olá, Ana.')).toBeOnTheScreen();
    expect(screen.getByText('Florianópolis · SC')).toBeOnTheScreen();
    await screen.findByText('Padel');
    expect(screen.queryByText(/T24/)).not.toBeOnTheScreen();
  });

  it('mostra o esporte principal com a categoria e abre Meus esportes', async () => {
    mockProfiles([
      makePlayerProfile({
        id: '8f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e51',
        isPrincipal: false,
        sport: makeSport({ id: 2, slug: 'tenis', name: 'Tênis' }),
      }),
      makePlayerProfile(),
    ]);
    renderWithQuery(<HomeScreen />);
    expect(await screen.findByText('Padel')).toBeOnTheScreen();
    expect(screen.queryByText('Tênis')).not.toBeOnTheScreen();
    expect(screen.getByText(/Categoria C/)).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Seu esporte principal'));
    expect(mockPush).toHaveBeenCalledWith('/sports');
  });

  it('convida a criar o primeiro perfil quando não há nenhum', async () => {
    mockProfiles([]);
    renderWithQuery(<HomeScreen />);
    expect(
      await screen.findByText('Comece pelo seu perfil esportivo'),
    ).toBeOnTheScreen();
  });

  it('avisa dos convites pendentes e abre a caixa de convites', async () => {
    mockProfiles([makePlayerProfile()], [makeMatch()], [makeMyInvite()]);
    renderWithQuery(<HomeScreen />);
    expect(
      await screen.findByText('Você tem 1 convite aguardando resposta'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Ver convites pendentes'));
    expect(mockPush).toHaveBeenCalledWith('/mine?view=invites&box=received');
  });

  it('não mostra o cartão de convites sem pendências', async () => {
    mockProfiles([makePlayerProfile()]);
    renderWithQuery(<HomeScreen />);
    await screen.findByText('Padel');
    expect(
      screen.queryByLabelText('Ver convites pendentes'),
    ).not.toBeOnTheScreen();
  });

  it('avisa dos pedidos de amizade e abre a caixa de pedidos (T33)', async () => {
    mockProfiles(
      [makePlayerProfile()],
      [makeMatch()],
      [],
      [{ id: 'r1' }, { id: 'r2' }],
    );
    renderWithQuery(<HomeScreen />);
    expect(
      await screen.findByText('Você tem 2 pedidos de amizade'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByLabelText('Ver convites pendentes'),
    ).not.toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Ver pedidos de amizade'));
    expect(mockPush).toHaveBeenCalledWith('/players?view=requests');
  });

  it('não mostra o cartão de pedidos sem pendências (T33)', async () => {
    mockProfiles([makePlayerProfile()]);
    renderWithQuery(<HomeScreen />);
    await screen.findByText('Padel');
    expect(
      screen.queryByLabelText('Ver pedidos de amizade'),
    ).not.toBeOnTheScreen();
  });

  it('mostra erro com nova tentativa quando os perfis falham', async () => {
    jest.spyOn(api, 'request').mockRejectedValue(new Error('rede'));
    renderWithQuery(<HomeScreen />);
    expect(await screen.findByText('Tentar novamente')).toBeOnTheScreen();
  });

  it('tem atalho para a disponibilidade', async () => {
    mockProfiles([makePlayerProfile()]);
    renderWithQuery(<HomeScreen />);
    await screen.findByText('Padel');
    fireEvent.press(screen.getByText('Disponibilidade'));
    expect(mockPush).toHaveBeenCalledWith('/availability');
  });

  it('lista as próximas partidas e leva ao detalhe', async () => {
    mockProfiles([makePlayerProfile()]);
    renderWithQuery(<HomeScreen />);
    fireEvent.press(await screen.findByLabelText('Padel de sábado'));
    expect(mockPush).toHaveBeenCalledWith(`/matches/${makeMatch().id}`);
    fireEvent.press(screen.getByText('Ver todas'));
    expect(mockPush).toHaveBeenCalledWith('/mine');
  });

  it('sem partidas futuras convida a explorar', async () => {
    mockProfiles([makePlayerProfile()], [makeMatch({ status: 'CANCELLED' })]);
    renderWithQuery(<HomeScreen />);
    fireEvent.press(await screen.findByText(/Nenhuma partida marcada/));
    expect(mockPush).toHaveBeenCalledWith('/matches');
  });

  it('mostra o rating do esporte principal e abre a aba Para você (T32)', async () => {
    const me = makeUser();
    jest
      .spyOn(api, 'request')
      .mockImplementation((config: { url?: string }) => {
        const url = String(config.url);
        return Promise.resolve(
          url === '/v1/matches/mine' ||
            url === '/v1/users/me/invites' ||
            url === '/v1/users/me/friend-requests'
            ? { status: 200, data: makePage([]) }
            : url === `/v1/users/${me.id}/profile`
              ? {
                  status: 200,
                  data: { data: makePublicProfile({ id: me.id }) },
                }
              : { status: 200, data: { data: [makePlayerProfile()] } },
        );
      });
    renderWithQuery(<HomeScreen />);
    expect(await screen.findByText('Rating ACE 1.512,0')).toBeOnTheScreen();
    expect(screen.getByText('· 8 partidas')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Para você'));
    expect(mockPush).toHaveBeenCalledWith('/for-you');
  });
});
