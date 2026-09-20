import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/lib/api-client';
import {
  makeMatch,
  makePage,
  makePlayerProfile,
  makeSport,
  makeUser,
} from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import { ExploreScreen, resetLocated } from './explore-screen';

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
  useFocusEffect: (effect: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(effect, [effect]);
  },
}));

type Config = {
  method?: string;
  url?: string;
  params?: unknown;
};
const match = makeMatch();
const mockApi = (
  pages: ReturnType<typeof makePage<typeof match>>[] = [makePage([match])],
) => {
  let page = 0;
  return jest.spyOn(api, 'request').mockImplementation((config: Config) => {
    const url = String(config.url);
    if (url === '/v1/sports')
      return Promise.resolve({ status: 200, data: { data: [makeSport()] } });
    if (url.includes('sport-profiles'))
      return Promise.resolve({
        status: 200,
        data: { data: [makePlayerProfile()] },
      });
    const body = pages[Math.min(page, pages.length - 1)];
    page += 1;
    return Promise.resolve({ status: 200, data: body });
  });
};

beforeEach(() => {
  seedToken();
  resetLocated();
  mockParams = { state: 'SC', city: 'Florianópolis' };
  mockSession({ status: 'signed-in', user: makeUser() });
});
afterEach(() => jest.restoreAllMocks());

describe('ExploreScreen', () => {
  it('na primeira visita sem filtros começa na cidade do jogador', async () => {
    mockParams = {};
    mockApi();
    renderWithQuery(<ExploreScreen />);
    await waitFor(() =>
      expect(mockSetParams).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'SC', city: 'Florianópolis' }),
      ),
    );
  });

  it('mostra esqueletos enquanto carrega', () => {
    jest.spyOn(api, 'request').mockReturnValue(new Promise(() => {}));
    renderWithQuery(<ExploreScreen />);
    expect(screen.getByRole('progressbar')).toBeOnTheScreen();
  });

  it('mostra erro com nova tentativa', async () => {
    jest.spyOn(api, 'request').mockRejectedValue(new Error('rede'));
    renderWithQuery(<ExploreScreen />);
    expect(await screen.findByText('Tentar novamente')).toBeOnTheScreen();
  });

  it('mostra o vazio com "Limpar filtros" quando há filtros ativos', async () => {
    mockApi([makePage([])]);
    renderWithQuery(<ExploreScreen />);
    expect(
      await screen.findByText('Nenhuma partida com esses filtros'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Limpar filtros'));
    expect(mockSetParams).toHaveBeenCalledWith(
      expect.objectContaining({ state: '', city: '', sportId: '' }),
    );
  });

  it('lista as partidas com os filtros da URL e abre o detalhe', async () => {
    const spy = mockApi();
    renderWithQuery(<ExploreScreen />);
    expect(await screen.findByText('Padel de sábado')).toBeOnTheScreen();
    const search = spy.mock.calls
      .map(([config]) => config as Config)
      .find((config) => config.url === '/v1/matches');
    expect(search?.params).toMatchObject({
      state: 'SC',
      city: 'Florianópolis',
      limit: 20,
    });
    expect(screen.getByText('Filtros (2)')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Padel de sábado'));
    expect(mockPush).toHaveBeenCalledWith(`/matches/${match.id}`);
  });

  it('carrega a próxima página pelo cursor', async () => {
    const second = makeMatch({
      id: '33333333-3333-4333-8333-333333333334',
      title: 'Segunda partida',
    });
    const spy = mockApi([makePage([match], 'cursor-2'), makePage([second])]);
    renderWithQuery(<ExploreScreen />);
    fireEvent.press(await screen.findByText('Carregar mais'));
    expect(await screen.findByText('Segunda partida')).toBeOnTheScreen();
    const calls = spy.mock.calls
      .map(([config]) => config as Config)
      .filter((config) => config.url === '/v1/matches');
    expect(calls.at(-1)?.params).toMatchObject({ cursor: 'cursor-2' });
  });

  it('grava a modalidade nos params e limpa a categoria', async () => {
    mockApi();
    renderWithQuery(<ExploreScreen />);
    fireEvent.press(await screen.findByText('Padel'));
    expect(mockSetParams).toHaveBeenCalledWith(
      expect.objectContaining({ sportId: '1', categoryCode: '', state: 'SC' }),
    );
  });

  it('aplica filtros da folha nos params', async () => {
    mockApi();
    renderWithQuery(<ExploreScreen />);
    fireEvent.press(await screen.findByText('Filtros (2)'));
    fireEvent.press(await screen.findByRole('button', { name: 'Formato' }));
    fireEvent.press(await screen.findByText('1v1 · Simples'));
    fireEvent.press(screen.getByText('Aplicar filtros'));
    expect(mockSetParams).toHaveBeenCalledWith(
      expect.objectContaining({ teamSize: '1', state: 'SC' }),
    );
  });
});
