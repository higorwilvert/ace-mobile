import { fireEvent, screen } from '@testing-library/react-native';

import { api, ApiError } from '@/lib/api-client';
import {
  makeHistoryEntry,
  makePage,
  makePublicProfile,
  makeSport,
  makeUser,
} from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import { RatingScreen } from './rating-screen';

jest.mock('@/features/auth/session');
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: () => {},
}));

type Config = { method?: string; url?: string; params?: unknown };
const me = makeUser();
const tenis = makeSport({
  id: 2,
  slug: 'tenis',
  name: 'Tênis',
  defaultTeamSize: 1,
  supportsSingles: true,
});
const base = makePublicProfile({ id: me.id, fullName: me.fullName });
const profile = {
  ...base,
  sportProfiles: [
    base.sportProfiles[0], // padel: 1512, RD 180, 8 partidas, 5V 3D 0E
    {
      ...base.sportProfiles[0],
      sportId: 2,
      sport: tenis,
      isPrincipal: false,
      categoryCode: null,
      category: null,
      rating: {
        rating: 1500,
        rd: 350,
        volatility: 0.06,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      },
    },
  ],
};
const mockApi = (
  entries = [makeHistoryEntry()],
  sportProfiles = profile.sportProfiles,
) =>
  jest.spyOn(api, 'request').mockImplementation((config: Config) => {
    const url = String(config.url);
    if (url === `/v1/users/${me.id}/profile`)
      return Promise.resolve({
        status: 200,
        data: { data: { ...profile, sportProfiles } },
      });
    if (url === '/v1/users/me/history') {
      // O filtro por modalidade é da API: só padel tem partidas na base.
      const { sportId } = (config.params ?? {}) as { sportId?: number };
      return Promise.resolve({
        status: 200,
        data: makePage(sportId && sportId !== 1 ? [] : entries),
      });
    }
    return Promise.reject(new ApiError('RESOURCE_NOT_FOUND', 404));
  });

beforeEach(async () => {
  mockSession({ status: 'signed-in', user: me });
  await seedToken();
});
afterEach(() => jest.restoreAllMocks());

describe('RatingScreen', () => {
  it('mostra o rating por modalidade, RD/σ sob demanda e os detalhes do processamento por partida', async () => {
    mockApi();
    renderWithQuery(<RatingScreen />);
    expect(await screen.findByLabelText('Rating 1.512,0')).toBeOnTheScreen();
    expect(screen.getByText('8 partidas processadas')).toBeOnTheScreen();
    expect(screen.getByLabelText('Rating 1.500,0')).toBeOnTheScreen();
    expect(
      screen.getByText('Estimativa inicial · sem resultados processados'),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Defina sua categoria/)).toBeOnTheScreen();
    expect(screen.queryByText(/Mede a incerteza/)).not.toBeOnTheScreen();
    fireEvent.press(screen.getAllByText('Entender os números')[0]);
    expect(screen.getByText(/Mede a incerteza/)).toBeOnTheScreen();
    expect(screen.getByText('180,0')).toBeOnTheScreen();
    expect(await screen.findByText('Padel de sábado')).toBeOnTheScreen();
    expect(
      screen.queryByText('Detalhes do processamento'),
    ).not.toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Rating +12,3'));
    expect(
      await screen.findByText('Detalhes do processamento'),
    ).toBeOnTheScreen();
    expect(screen.getByText('glicko2-v1')).toBeOnTheScreen();
    expect(screen.getByText('1500 → 1512.3')).toBeOnTheScreen();
    expect(screen.getByText('350 → 290.5')).toBeOnTheScreen();
    expect(screen.getByText('+12,3 pontos')).toBeOnTheScreen();
  });
  it('filtra a evolução pela modalidade tocada', async () => {
    const spy = mockApi();
    renderWithQuery(<RatingScreen />);
    await screen.findByText('Padel de sábado');
    fireEvent.press(screen.getByRole('button', { name: 'Tênis' }));
    await screen.findByText('Nada nesta modalidade ainda');
    const calls = spy.mock.calls
      .map(([c]) => c as Config)
      .filter((c) => c.url === '/v1/users/me/history');
    expect(calls.at(-1)?.params).toMatchObject({ sportId: 2 });
  });
  it('sem resultados, aponta para as minhas partidas; sem modalidade, para o perfil esportivo', async () => {
    mockApi([]);
    renderWithQuery(<RatingScreen />);
    expect(
      await screen.findByText('Sua evolução começa com o primeiro resultado'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Ver minhas partidas'));
    expect(mockPush).toHaveBeenCalledWith('/mine');
    jest.restoreAllMocks();
    mockApi([], []);
    renderWithQuery(<RatingScreen />);
    expect(
      await screen.findByText('Adicione uma modalidade para começar'),
    ).toBeOnTheScreen();
  });
});
