import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api, ApiError } from '@/lib/api-client';
import {
  makeHistoryEntry,
  makePage,
  makePublicProfile,
  makeTotals,
  otherPlayer,
} from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { seedToken } from '@/test/session-mock';

import { HistoryScreen } from './history-screen';

const mockPush = jest.fn();
const mockSetParams = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: mockBack,
    setParams: mockSetParams,
  }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));

type Config = { method?: string; url?: string; params?: unknown };
const entry = makeHistoryEntry();
const older = makeHistoryEntry({
  match: {
    ...entry.match,
    id: '14141414-1414-4141-8141-141414141414',
    title: 'Padel de domingo',
  },
  outcome: 'LOSS',
  setsWon: 0,
  setsLost: 2,
  sets: [
    { setNumber: 1, own: 4, opponent: 6, tiebreak: null },
    { setNumber: 2, own: 6, opponent: 7, tiebreak: { own: 5, opponent: 7 } },
  ],
  ratingChange: {
    ...entry.ratingChange!,
    ratingBefore: 1512.3,
    ratingAfter: 1504.1,
  },
});
const mockApi = ({
  totals = [makeTotals()],
  pages = [makePage([entry], 'cursor-2'), makePage([older])],
}: {
  totals?: ReturnType<typeof makeTotals>[];
  pages?: ReturnType<typeof makePage<typeof entry>>[];
} = {}) =>
  jest.spyOn(api, 'request').mockImplementation((config: Config) => {
    const url = String(config.url);
    if (url.endsWith('/history/summary'))
      return Promise.resolve({ status: 200, data: { data: totals } });
    if (url.endsWith('/history'))
      return Promise.resolve({
        status: 200,
        data: (config.params as { cursor?: string } | undefined)?.cursor
          ? pages[1]
          : pages[0],
      });
    return Promise.resolve({
      status: 200,
      data: { data: makePublicProfile() },
    });
  });

beforeEach(() => {
  seedToken();
  mockParams = {};
});
afterEach(() => jest.restoreAllMocks());

describe('HistoryScreen', () => {
  it('mostra totais e entradas do meu histórico, com placar, rival e rating', async () => {
    const spy = mockApi();
    renderWithQuery(<HistoryScreen />);
    expect(await screen.findByText('3 partidas')).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        'Padel: 3 partidas, 2 vitórias, 1 derrotas, 0 empates',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Vitória')).toBeOnTheScreen();
    expect(screen.getByText('2–0 em sets')).toBeOnTheScreen();
    expect(screen.getByText('6-4 · 6-3')).toBeOnTheScreen();
    expect(screen.getByText('Bruno Lima')).toBeOnTheScreen();
    expect(screen.getByText('+12,3')).toBeOnTheScreen();
    const urls = spy.mock.calls.map(([c]) => (c as Config).url);
    expect(urls).toContain('/v1/users/me/history/summary');
    expect(urls).toContain('/v1/users/me/history');
  });

  it('tocar na tile filtra por modalidade nos params; tocar de novo limpa', async () => {
    mockApi();
    renderWithQuery(<HistoryScreen />);
    fireEvent.press(await screen.findByText('3 partidas'));
    expect(mockSetParams).toHaveBeenCalledWith({ sportId: '1', userId: '' });
    mockParams = { sportId: '1' };
    const spy = mockApi();
    renderWithQuery(<HistoryScreen />);
    fireEvent.press(await screen.findAllByText('3 partidas').then((a) => a[0]));
    expect(mockSetParams).toHaveBeenLastCalledWith({ sportId: '', userId: '' });
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/v1/users/me/history',
          params: expect.objectContaining({ sportId: 1 }),
        }),
      ),
    );
  });

  it('carrega a próxima página pelo cursor', async () => {
    const spy = mockApi();
    renderWithQuery(<HistoryScreen />);
    fireEvent.press(await screen.findByText('Carregar mais'));
    expect(await screen.findByText('Padel de domingo')).toBeOnTheScreen();
    expect(screen.getByText('Derrota')).toBeOnTheScreen();
    expect(screen.getByText('4-6 · 6-7 (5-7)')).toBeOnTheScreen();
    expect(screen.getByText('-8,2')).toBeOnTheScreen();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ cursor: 'cursor-2' }),
      }),
    );
  });

  it('abre o detalhe da partida e o perfil do adversário', async () => {
    mockApi();
    renderWithQuery(<HistoryScreen />);
    fireEvent.press(await screen.findByLabelText('Abrir Padel de sábado'));
    expect(mockPush).toHaveBeenCalledWith(`/matches/${entry.match.id}`);
    fireEvent.press(screen.getByText('Bruno Lima'));
    expect(mockPush).toHaveBeenCalledWith(`/players/${otherPlayer.id}`);
  });

  it('vazio sem partidas', async () => {
    mockApi({ totals: [], pages: [makePage([]), makePage([])] });
    renderWithQuery(<HistoryScreen />);
    expect(
      await screen.findByText('Nenhuma partida registrada ainda'),
    ).toBeOnTheScreen();
  });

  it('com userId usa a rota pública, o nome do jogador e esconde o rating', async () => {
    mockParams = { userId: otherPlayer.id };
    const spy = mockApi();
    renderWithQuery(<HistoryScreen />);
    expect(await screen.findByText(/Histórico de Bruno/)).toBeOnTheScreen();
    expect(screen.queryByText('+12,3')).not.toBeOnTheScreen();
    const urls = spy.mock.calls.map(([c]) => (c as Config).url);
    expect(urls).toContain(`/v1/users/${otherPlayer.id}/history/summary`);
    expect(urls).toContain(`/v1/users/${otherPlayer.id}/history`);
  });

  it('perfil privado (403) explica em vez de mostrar erro', async () => {
    mockParams = { userId: otherPlayer.id };
    jest.spyOn(api, 'request').mockImplementation((config: Config) =>
      String(config.url).includes('/history')
        ? Promise.reject(new ApiError('PROFILE_PRIVATE', 403))
        : Promise.resolve({
            status: 200,
            data: { data: makePublicProfile() },
          }),
    );
    renderWithQuery(<HistoryScreen />);
    expect(
      await screen.findByText('Este histórico é privado'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Voltar'));
    expect(mockBack).toHaveBeenCalled();
  });
});
