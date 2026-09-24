import { fireEvent, screen } from '@testing-library/react-native';

import { api, ApiError } from '@/lib/api-client';
import {
  makeHistoryEntry,
  makePage,
  makePublicProfile,
  makeSport,
  makeTier,
  makeTierTable,
  makeTotals,
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
    base.sportProfiles[0], // padel: 1512 (Platina I), RD 180, 8 partidas
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
        algorithmVersion: 'glicko2-v1',
        confidence: 0,
        tier: makeTier({
          progress: 0,
          pointsToNext: 100,
          provisional: true,
          imagePath: null,
        }),
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
    if (url === `/v1/users/${me.id}/history/summary`)
      return Promise.resolve({ status: 200, data: { data: [makeTotals()] } });
    if (url === '/v1/rating-tiers')
      return Promise.resolve({ status: 200, data: { data: makeTierTable() } });
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
  it('mostra a divisão, a escada, os números do Glicko-2 e os detalhes por partida', async () => {
    mockApi();
    renderWithQuery(<RatingScreen />);
    expect(await screen.findByText('Você está aqui')).toBeOnTheScreen();
    expect(screen.getAllByText('Platina I').length).toBeGreaterThan(1);
    expect(screen.getByText('8 partidas processadas')).toBeOnTheScreen();
    expect(screen.getByText('faltam 88 pontos')).toBeOnTheScreen();
    expect(screen.getByText('49%')).toBeOnTheScreen();
    // Escada da API, da mais alta à mais baixa, com os limites.
    expect(screen.getByText('2.000 ou mais')).toBeOnTheScreen();
    expect(screen.getByText('abaixo de 1.000')).toBeOnTheScreen();
    // Detalhes técnicos abertos nesta tela: nenhum número do Glicko-2 some,
    // e o rating também aparece pequeno ao lado da divisão.
    expect(screen.getAllByText('1.512')).toHaveLength(2);
    expect(screen.getByText('180')).toBeOnTheScreen();
    expect(screen.getByText('ace-glicko2-v1 · ace-tiers-v1')).toBeOnTheScreen();
    expect(screen.getByText('1.500 a 1.600')).toBeOnTheScreen();
    expect(await screen.findByText('Padel de sábado')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Rating +12,3'));
    expect(
      await screen.findByText('Detalhes do processamento'),
    ).toBeOnTheScreen();
    expect(screen.getByText('glicko2-v1')).toBeOnTheScreen();
    expect(screen.getByText('1500 → 1512.3')).toBeOnTheScreen();
    expect(screen.getByText('+12,3 pontos')).toBeOnTheScreen();
  });
  it('troca a modalidade: divisão, escada e evolução seguem a escolha', async () => {
    const spy = mockApi();
    renderWithQuery(<RatingScreen />);
    await screen.findByText('Padel de sábado');
    fireEvent.press(screen.getByRole('button', { name: 'Tênis' }));
    expect(await screen.findByText('Estimativa inicial')).toBeOnTheScreen();
    // Início da divisão e confiança zerada: as duas barras em 0%.
    expect(screen.getAllByText('0%')).toHaveLength(2);
    expect(screen.getByText(/Defina sua categoria/)).toBeOnTheScreen();
    await screen.findByText('Sua evolução começa com o primeiro resultado');
    const calls = spy.mock.calls.map(([c]) => c as Config);
    expect(
      calls.filter((c) => c.url === '/v1/users/me/history').at(-1)?.params,
    ).toMatchObject({ sportId: 2 });
    expect(
      calls.filter((c) => c.url === '/v1/rating-tiers').at(-1)?.params,
    ).toMatchObject({ sportId: 2 });
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
