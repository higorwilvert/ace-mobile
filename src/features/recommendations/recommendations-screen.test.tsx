import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { toast } from 'sonner-native';

import { api, ApiError } from '@/lib/api-client';
import {
  makeApplication,
  makeMatch,
  makeMatchDetail,
  makeMatchRecommendations,
  makePage,
  makePlayerProfile,
  makePlayerRecommendations,
  makeRecommendedPlayer,
  makeSport,
  makeUser,
  otherPlayer,
} from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import { RecommendationsScreen } from './recommendations-screen';

jest.mock('@/features/auth/session');
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: () => {},
}));

type Config = {
  method?: string;
  url?: string;
  data?: unknown;
  params?: unknown;
};
type Reply = { status: number; data: unknown };
type Responder = (config: Config) => Reply | Promise<never> | undefined;
const mockApi = (
  extra: Responder = () => undefined,
  profiles = [makePlayerProfile()],
) =>
  jest.spyOn(api, 'request').mockImplementation((config: Config) => {
    const url = String(config.url);
    const custom = extra(config);
    if (custom) return Promise.resolve(custom);
    if (url === '/v1/sports')
      return Promise.resolve({ status: 200, data: { data: [makeSport()] } });
    if (url === '/v1/users/me/sport-profiles')
      return Promise.resolve({ status: 200, data: { data: profiles } });
    if (url === '/v1/recommendations/players')
      return Promise.resolve({
        status: 201,
        data: makePlayerRecommendations(),
      });
    if (url === '/v1/recommendations/matches')
      return Promise.resolve({ status: 201, data: makeMatchRecommendations() });
    if (url === '/v1/matches/mine')
      return Promise.resolve({ status: 200, data: makePage([makeMatch()]) });
    if (config.method === 'POST' && url.endsWith('/applications'))
      return Promise.resolve({
        status: 201,
        data: { data: makeApplication() },
      });
    return Promise.resolve({ status: 200, data: { data: makeMatchDetail() } });
  });
const generations = (spy: jest.SpyInstance) =>
  spy.mock.calls
    .map(([c]) => c as Config)
    .filter((c) => String(c.url).startsWith('/v1/recommendations'));
const confirmApply = () =>
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
    buttons?.find((b) => b.text === 'Candidatar-me')?.onPress?.();
  });

beforeEach(async () => {
  mockSession({ status: 'signed-in', user: makeUser() });
  await seedToken();
});
afterEach(() => jest.restoreAllMocks());

describe('RecommendationsScreen', () => {
  it('não gera nada ao abrir; o botão dispara o POST e a lista preserva a ordem da API', async () => {
    const second = makeRecommendedPlayer({
      recommendationId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      rank: 2,
      totalScore: 0.6625,
      scoreBreakdown: {
        level: 0.75,
        distance: 1,
        activity: 0.5,
        preferences: 0,
      },
      player: {
        ...otherPlayer,
        id: '45454545-4545-4545-8545-454545454545',
        fullName: 'Carla Nunes',
      },
    });
    const spy = mockApi((c) =>
      c.url === '/v1/recommendations/players'
        ? {
            status: 201,
            data: makePlayerRecommendations([makeRecommendedPlayer(), second]),
          }
        : undefined,
    );
    renderWithQuery(<RecommendationsScreen />);
    expect(await screen.findByText('Buscar sugestões')).toBeOnTheScreen();
    expect(
      screen.getByText('Sua próxima conexão começa aqui'),
    ).toBeOnTheScreen();
    expect(generations(spy)).toHaveLength(0);
    fireEvent.press(screen.getByText('Buscar sugestões'));
    expect(await screen.findByText('2 sugestões para você')).toBeOnTheScreen();
    expect(generations(spy)).toEqual([
      expect.objectContaining({
        method: 'POST',
        url: '/v1/recommendations/players',
        data: { sportId: 1, teamSize: 2, mode: 'SAME_GENDER', limit: 10 },
      }),
    ]);
    expect(
      screen
        .getAllByLabelText(/^Ver perfil de/)
        .map((n) => n.props.accessibilityLabel),
    ).toEqual(['Ver perfil de Bruno Lima', 'Ver perfil de Carla Nunes']);
    expect(
      screen.getByLabelText('Compatibilidade 82,5 de 100'),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Compatibilidade 66,3 de 100'),
    ).toBeOnTheScreen();
    expect(screen.getAllByText('Compatibilidade de nível')).toHaveLength(2);
    expect(
      screen.getByText(
        'Sem filtro de agenda. Combine o horário antes de convidar.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Atualizar sugestões')).toBeOnTheScreen();
  });

  it('expõe o modo técnico e abre o convite restrito ao escopo da busca', async () => {
    const spy = mockApi();
    renderWithQuery(<RecommendationsScreen />);
    fireEvent.press(await screen.findByText('Buscar sugestões'));
    fireEvent.press(await screen.findByText('Por que esta recomendação?'));
    fireEvent.press(screen.getByText('Detalhes técnicos'));
    expect(screen.getByText('ace-player-v1')).toBeOnTheScreen();
    expect(screen.getAllByText('0.825000')).toHaveLength(2);
    fireEvent.press(screen.getByText('Informações desta geração'));
    expect(
      screen.getByText('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Convidar para jogar'));
    // Ana é FEMALE + mesmo gênero → só as minhas partidas FEMALE 2v2 de padel.
    expect(await screen.findByText('Padel de sábado')).toBeOnTheScreen();
    expect(
      screen.getByText(/mesma modalidade, formato e composição/),
    ).toBeOnTheScreen();
    const mine = spy.mock.calls
      .map(([c]) => c as Config)
      .find((c) => c.url === '/v1/matches/mine');
    expect(mine?.params).toMatchObject({ role: 'creator', status: 'OPEN' });
  });

  it('partidas: candidatura confirma, envia o time sugerido e marca o card', async () => {
    const spy = mockApi();
    confirmApply();
    renderWithQuery(<RecommendationsScreen />);
    fireEvent.press(await screen.findByText('Partidas'));
    fireEvent.press(await screen.findByText('Buscar sugestões'));
    expect(await screen.findByText('1 sugestão para você')).toBeOnTheScreen();
    expect(screen.getByText('2 vagas · Time 2 sugerido')).toBeOnTheScreen();
    expect(screen.queryByText('ace-match-v1')).not.toBeOnTheScreen(); // versão só ao expandir
    fireEvent.press(screen.getByText('Candidatar-me'));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `/v1/matches/${makeMatch().id}/applications`,
          data: { teamIndex: 2 },
        }),
      ),
    );
    expect(await screen.findByText('Candidatura enviada')).toBeOnTheScreen();
    expect(screen.queryByText('Candidatar-me')).not.toBeOnTheScreen();
    expect(toast.success).toHaveBeenCalled();
  });

  it('409 na candidatura vira toast e mantém o botão', async () => {
    mockApi((c) =>
      c.method === 'POST' && String(c.url).endsWith('/applications')
        ? Promise.reject(new ApiError('MATCH_FULL', 409))
        : undefined,
    );
    confirmApply();
    renderWithQuery(<RecommendationsScreen />);
    fireEvent.press(await screen.findByText('Partidas'));
    fireEvent.press(await screen.findByText('Buscar sugestões'));
    fireEvent.press(await screen.findByText('Candidatar-me'));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByText('Candidatar-me')).toBeOnTheScreen();
    expect(screen.queryByText('Candidatura enviada')).not.toBeOnTheScreen();
  });

  it('sem disponibilidade, partidas vêm vazias com o caminho para cadastrar', async () => {
    mockApi((c) =>
      c.url === '/v1/recommendations/matches'
        ? {
            status: 201,
            data: makeMatchRecommendations([], {
              availability: 'NOT_CONFIGURED',
            }),
          }
        : undefined,
    );
    renderWithQuery(<RecommendationsScreen />);
    fireEvent.press(await screen.findByText('Partidas'));
    fireEvent.press(await screen.findByText('Buscar sugestões'));
    expect(
      await screen.findByText(
        'Cadastre sua disponibilidade para encontrar partidas',
      ),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Cadastrar disponibilidade'));
    expect(mockPush).toHaveBeenCalledWith('/availability');
    fireEvent.press(screen.getByText('Explorar partidas'));
    expect(mockPush).toHaveBeenCalledWith('/matches?sportId=1');
  });

  it('erro da API fica no formulário e a nova busca é manual', async () => {
    const spy = mockApi((c) =>
      c.url === '/v1/recommendations/players'
        ? Promise.reject(new ApiError('RATING_INITIALIZATION_REQUIRED', 400))
        : undefined,
    );
    renderWithQuery(<RecommendationsScreen />);
    fireEvent.press(await screen.findByText('Buscar sugestões'));
    expect(
      await screen.findByText(
        'Defina sua categoria nesta modalidade para inicializar o rating e receber recomendações.',
      ),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Revisar categoria'));
    expect(mockPush).toHaveBeenCalledWith('/sports');
    expect(generations(spy)).toHaveLength(1);
    expect(screen.getByText('Buscar sugestões')).toBeOnTheScreen();
  });

  it('sem perfil esportivo, convida a montar o perfil', async () => {
    mockApi(() => undefined, []);
    renderWithQuery(<RecommendationsScreen />);
    expect(
      await screen.findByText('Adicione sua primeira modalidade'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Montar perfil esportivo'));
    expect(mockPush).toHaveBeenCalledWith('/sports');
  });
});
