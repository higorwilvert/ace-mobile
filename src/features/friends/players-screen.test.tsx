import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';

import { api } from '@/lib/api-client';
import {
  makeFriend,
  makeFriendRequest,
  makePage,
  makeRelationship,
  makeSearchItem,
  makeSport,
  makeUser,
  otherPlayer,
} from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import { PlayersScreen } from './players-screen';

jest.mock('@/features/auth/session');
const mockPush = jest.fn();
const mockSetParams = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    setParams: mockSetParams,
  }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));

type Config = { method?: string; url?: string; params?: unknown };
type Responses = {
  search?: unknown[];
  friends?: unknown[];
  received?: unknown[];
  sent?: unknown[];
};
const mockApi = (r: Responses = {}) =>
  jest.spyOn(api, 'request').mockImplementation((config: Config) => {
    const url = String(config.url);
    const params = (config.params ?? {}) as Record<string, unknown>;
    if (config.method === 'POST' || config.method === 'DELETE')
      return Promise.resolve({
        status: 200,
        data: { data: makeFriendRequest({ status: 'ACCEPTED' }) },
      });
    if (url === '/v1/sports')
      return Promise.resolve({ status: 200, data: { data: [makeSport()] } });
    if (url === '/v1/users')
      return Promise.resolve({ status: 200, data: { data: r.search ?? [] } });
    if (url === '/v1/users/me/friends')
      return Promise.resolve({ status: 200, data: makePage(r.friends ?? []) });
    if (url === '/v1/users/me/friend-requests')
      return Promise.resolve({
        status: 200,
        data: makePage(
          params.direction === 'sent' ? (r.sent ?? []) : (r.received ?? []),
        ),
      });
    return Promise.resolve({ status: 200, data: makePage([]) });
  });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  seedToken();
  mockSession({ status: 'signed-in', user: makeUser() });
  mockParams = {};
});
afterEach(() => jest.restoreAllMocks());

describe('PlayersScreen › Buscar', () => {
  it('explica a busca antes de duas letras e não chama a API', async () => {
    const spy = mockApi();
    renderWithQuery(<PlayersScreen />);
    expect(
      await screen.findByText('Encontre quem joga com você'),
    ).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('Nome do jogador'), 'a');
    await sleep(400);
    expect(spy.mock.calls.some(([c]) => c.url === '/v1/users')).toBe(false);
    expect(mockSetParams).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'a' }),
    );
  });
  it('busca com debounce, filtra por modalidade e mostra relação e cadeado', async () => {
    mockParams = { q: 'bru' };
    const spy = mockApi({
      search: [
        makeSearchItem({
          profileVisibility: 'PRIVATE',
          relationship: makeRelationship({ status: 'NONE' }),
        }),
      ],
    });
    renderWithQuery(<PlayersScreen />);
    expect(await screen.findByText('Bruno Lima')).toBeOnTheScreen();
    expect(screen.getByLabelText('Perfil privado')).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: 'Padel' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeOnTheScreen();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/v1/users',
        params: { q: 'bru', limit: 30 },
      }),
    );
    fireEvent.press(
      within(await screen.findByLabelText('Modalidade')).getByText('Padel'),
    );
    expect(mockSetParams).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'bru', sportId: '1' }),
    );
    fireEvent.changeText(screen.getByLabelText('Nome do jogador'), 'bruno');
    await waitFor(() =>
      expect(mockSetParams).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'bruno' }),
      ),
    );
    // A linha abre o perfil.
    fireEvent.press(screen.getByRole('button', { name: 'Bruno Lima' }));
    expect(mockPush).toHaveBeenCalledWith(`/players/${otherPlayer.id}`);
  });
  it('quem busca aparece marcado como "Você", sem botão', async () => {
    mockParams = { q: 'ana' };
    const me = makeUser();
    mockApi({
      search: [
        makeSearchItem({
          id: me.id,
          fullName: me.fullName,
          relationship: makeRelationship({ status: 'SELF' }),
        }),
      ],
    });
    renderWithQuery(<PlayersScreen />);
    expect(await screen.findByText('Ana Clara Souza')).toBeOnTheScreen();
    expect(screen.getByText('Você')).toBeOnTheScreen();
    expect(screen.queryByText('Adicionar')).not.toBeOnTheScreen();
  });
  it('mostra o vazio quando ninguém tem o nome e limpa a busca', async () => {
    mockParams = { q: 'zzz' };
    mockApi({ search: [] });
    renderWithQuery(<PlayersScreen />);
    expect(
      await screen.findByText('Ninguém com esse nome por aqui'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Limpar busca'));
    await waitFor(() =>
      expect(mockSetParams).toHaveBeenCalledWith(
        expect.objectContaining({ q: '' }),
      ),
    );
  });
});

describe('PlayersScreen › Amigos', () => {
  it('lista amigos com "Desde" e o botão Amigos', async () => {
    mockParams = { view: 'friends' };
    mockApi({ friends: [makeFriend()] });
    renderWithQuery(<PlayersScreen />);
    expect(await screen.findByText('Bruno Lima')).toBeOnTheScreen();
    expect(screen.getByText(/Desde set\. 2026/)).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Amigos com Bruno Lima. Desfazer amizade'),
    ).toBeOnTheScreen();
  });
  it('sem amigos convida a buscar', async () => {
    mockParams = { view: 'friends' };
    mockApi();
    renderWithQuery(<PlayersScreen />);
    expect(await screen.findByText('Sua rede começa aqui')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Buscar jogadores' }));
    expect(mockSetParams).toHaveBeenCalledWith(
      expect.objectContaining({ view: 'search' }),
    );
  });
});

describe('PlayersScreen › Pedidos', () => {
  it('recebidos: aceitar chama a API e a linha some após o refetch', async () => {
    mockParams = { view: 'requests' };
    const request = makeFriendRequest();
    const spy = mockApi({ received: [request] });
    renderWithQuery(<PlayersScreen />);
    expect(await screen.findByText('Bruno Lima')).toBeOnTheScreen();
    expect(screen.getByText(/Pediu em/)).toBeOnTheScreen();
    // A partir daqui a lista volta vazia (pedido decidido).
    spy.mockImplementation((config: Config) =>
      Promise.resolve(
        config.method === 'POST'
          ? { status: 200, data: { data: { ...request, status: 'ACCEPTED' } } }
          : { status: 200, data: makePage([]) },
      ),
    );
    fireEvent.press(
      screen.getByLabelText('Aceitar pedido de amizade de Bruno Lima'),
    );
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `/v1/friend-requests/${request.id}/accept`,
        }),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByText('Bruno Lima')).not.toBeOnTheScreen(),
    );
    expect(screen.getByText('Nenhum pedido esperando você')).toBeOnTheScreen();
  });
  it('enviados: mostra "Cancelar" e o contador de pendências no segmento', async () => {
    mockParams = { view: 'requests', box: 'sent' };
    const me = makeUser();
    mockApi({
      sent: [
        makeFriendRequest({
          requester: {
            id: me.id,
            fullName: me.fullName,
            avatarUrl: null,
            city: me.city,
            state: me.state,
          },
          addressee: otherPlayer,
        }),
      ],
      received: [
        makeFriendRequest(),
        makeFriendRequest({ id: 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd' }),
      ],
    });
    renderWithQuery(<PlayersScreen />);
    expect(await screen.findByText(/Enviado em/)).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Cancelar pedido de amizade para Bruno Lima'),
    ).toBeOnTheScreen();
    expect(
      await screen.findByLabelText('Pedidos, 2 pendentes'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Recebidos' }));
    expect(mockSetParams).toHaveBeenCalledWith(
      expect.objectContaining({ view: 'requests', box: 'received' }),
    );
  });
});
