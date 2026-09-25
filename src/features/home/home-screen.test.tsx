import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/lib/api-client';
import {
  makeFeed,
  makeHome,
  makeInvite,
  makeMatch,
  makeMyInvite,
  makeUser,
  otherPlayer,
} from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import type { Home } from './api';
import { HomeScreen } from './home-screen';

jest.mock('@/features/auth/session');
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  useFocusEffect: () => {},
}));

const mockApi = (home: Home | (() => Home) = makeHome(), feed = makeFeed()) =>
  jest.spyOn(api, 'request').mockImplementation((config: { url?: string }) =>
    Promise.resolve(
      config.url === '/v1/users/me/home'
        ? {
            status: 200,
            data: { data: typeof home === 'function' ? home() : home },
          }
        : config.url === '/v1/recommendations/refresh'
          ? { status: 200, data: { data: feed } }
          : String(config.url).endsWith('/accept')
            ? {
                status: 200,
                data: { data: makeInvite({ status: 'ACCEPTED' }) },
              }
            : { status: 404, data: {} },
    ),
  );
const calls = (spy: jest.SpyInstance, url: string) =>
  spy.mock.calls.filter(([c]) => (c as { url?: string }).url === url).length;
const staleHome = () =>
  makeHome({ suggestions: { ...makeHome().suggestions!, stale: true } });
const pull = () =>
  act(async () =>
    screen.getByTestId('screen-scroll').props.refreshControl.props.onRefresh(),
  );

beforeEach(async () => {
  mockPush.mockClear();
  mockSession({ status: 'signed-in', user: makeUser() });
  await seedToken();
});
afterEach(() => jest.restoreAllMocks());

describe('HomeScreen (T38)', () => {
  it('feed completo em uma chamada quando as sugestões estão frescas', async () => {
    const spy = mockApi();
    renderWithQuery(<HomeScreen />);
    expect(await screen.findByText('Próxima partida')).toBeOnTheScreen();
    expect(screen.getByText('Olá, Ana.')).toBeOnTheScreen();
    expect(screen.getByText(/Rating 1\.372/)).toBeOnTheScreen();
    expect(screen.getByText('Pendências')).toBeOnTheScreen();
    expect(screen.getByText('Aguardando placar')).toBeOnTheScreen();
    expect(screen.getByText('Sugestões para você')).toBeOnTheScreen();
    expect(screen.getByText('Atividade dos amigos')).toBeOnTheScreen();
    expect(screen.getByText('Bruno venceu Camila')).toBeOnTheScreen();
    expect(
      screen.queryByText('Jogadores e partidas para você'),
    ).not.toBeOnTheScreen();
    expect(calls(spy, '/v1/users/me/home')).toBe(1);
    expect(calls(spy, '/v1/recommendations/refresh')).toBe(0);
  });

  it('sugestões velhas: gera sozinho, avisa e fica em 2 chamadas', async () => {
    const spy = mockApi(staleHome());
    renderWithQuery(<HomeScreen />);
    expect(
      await screen.findByText('Há 2 sugestões novas para você'),
    ).toBeOnTheScreen();
    expect(calls(spy, '/v1/users/me/home')).toBe(1);
    expect(calls(spy, '/v1/recommendations/refresh')).toBe(1);
    fireEvent.press(screen.getByLabelText('Dispensar aviso'));
    await waitFor(() =>
      expect(
        screen.queryByText('Há 2 sugestões novas para você'),
      ).not.toBeOnTheScreen(),
    );
  });

  it('puxar para atualizar refaz o GET sem gerar de novo na mesma montagem', async () => {
    const spy = mockApi(staleHome());
    renderWithQuery(<HomeScreen />);
    await screen.findByText('Há 2 sugestões novas para você');
    await pull();
    await waitFor(() => expect(calls(spy, '/v1/users/me/home')).toBe(2));
    expect(calls(spy, '/v1/recommendations/refresh')).toBe(1);
  });

  it('nova geração velha (outro snapshot) dispara um novo refresh na mesma montagem', async () => {
    let gets = 0;
    const later = () => {
      const home = staleHome();
      const players = home.suggestions!.players!;
      return gets++ === 0
        ? home
        : makeHome({
            suggestions: {
              ...home.suggestions!,
              players: {
                ...players,
                meta: {
                  ...players.meta,
                  generationId: 'abababab-abab-4bab-8bab-abababababab',
                },
              },
            },
          });
    };
    const spy = mockApi(later);
    renderWithQuery(<HomeScreen />);
    await screen.findByText('Há 2 sugestões novas para você');
    await pull();
    await waitFor(() =>
      expect(calls(spy, '/v1/recommendations/refresh')).toBe(2),
    );
  });

  it('aceitar convite no Início atualiza o feed', async () => {
    const me = makeUser();
    const spy = mockApi(
      makeHome({
        pending: {
          ...makeHome().pending,
          invites: [
            makeMyInvite({
              inviter: otherPlayer,
              invitee: {
                ...makeInvite().invitee,
                id: me.id,
                fullName: me.fullName,
              },
            }),
          ],
        },
      }),
    );
    renderWithQuery(<HomeScreen />);
    fireEvent.press(await screen.findByLabelText('Aceitar convite de Bruno'));
    await waitFor(() => expect(calls(spy, '/v1/users/me/home')).toBe(2));
  });

  it('leitor de tela ouve o conteúdo das linhas, não só a ação', async () => {
    mockApi();
    renderWithQuery(<HomeScreen />);
    expect(
      await screen.findByLabelText(/^Bruno venceu Camila\. 6-4 · 6-3/),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText(/Você e Bruno contra vagas abertas/),
    ).toBeOnTheScreen();
  });

  it('erro de um tipo aparece só nele', async () => {
    mockApi(
      staleHome(),
      makeFeed({
        matches: {
          error: { code: 'X', message: 'Cadastre sua disponibilidade' },
        },
      }),
    );
    renderWithQuery(<HomeScreen />);
    expect(
      await screen.findByText('Cadastre sua disponibilidade'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Sugestões para você')).toBeOnTheScreen();
    expect(
      screen.getByLabelText(/^Bruno Lima, compatibilidade/),
    ).toBeOnTheScreen();
  });

  it('ações diretas das pendências', async () => {
    mockApi();
    renderWithQuery(<HomeScreen />);
    const { id } = makeMatch();
    fireEvent.press(await screen.findByLabelText(/^Registrar placar/));
    expect(mockPush).toHaveBeenLastCalledWith(`/matches/${id}/result`);
    fireEvent.press(screen.getByLabelText(/^Revisar 2 candidaturas/));
    expect(mockPush).toHaveBeenLastCalledWith(`/matches/${id}`);
    fireEvent.press(screen.getByLabelText(/^Ver 2 pedidos de amizade/));
    expect(mockPush).toHaveBeenLastCalledWith('/players?view=requests');
  });

  it('usuário novo: disponibilidade vira pendência e os blocos mostram vazios', async () => {
    mockApi(
      makeHome({
        principal: null,
        nextMatch: null,
        upcomingCount: 0,
        suggestions: null,
        friendActivity: [],
        pending: {
          invites: [],
          invitesTotal: 0,
          applications: [],
          applicationsTotal: 0,
          results: [],
          resultsTotal: 0,
          friendRequests: 0,
          availability: false,
        },
      }),
    );
    renderWithQuery(<HomeScreen />);
    fireEvent.press(await screen.findByLabelText(/^Definir horários/));
    expect(mockPush).toHaveBeenLastCalledWith('/availability');
    expect(
      screen.getByLabelText(/Nenhuma partida confirmada/),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Sugestões para você')).not.toBeOnTheScreen();
  });
});
