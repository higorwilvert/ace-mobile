import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { toast } from 'sonner-native';

import { noticeKey } from '@/features/home/api';
import { api, ApiError } from '@/lib/api-client';
import {
  makeApplication,
  makeFeed,
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
    if (url === '/v1/recommendations/refresh')
      return Promise.resolve({
        status: 200,
        data: { data: makeFeed({ generated: [] }) },
      });
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

const refreshWith = (feed: ReturnType<typeof makeFeed>) => (c: Config) =>
  c.url === '/v1/recommendations/refresh'
    ? { status: 200, data: { data: feed } }
    : undefined;

describe('RecommendationsScreen (T38)', () => {
  it('abre direto na lista da modalidade principal, com uma chamada e a ordem da API', async () => {
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
    const spy = mockApi(
      refreshWith(
        makeFeed({
          generated: [],
          players: makePlayerRecommendations([makeRecommendedPlayer(), second]),
        }),
      ),
    );
    renderWithQuery(<RecommendationsScreen />);
    expect(await screen.findByText('2 sugestões para você')).toBeOnTheScreen();
    expect(generations(spy)).toEqual([
      expect.objectContaining({
        method: 'POST',
        url: '/v1/recommendations/refresh',
        data: { sportId: 1 },
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
    expect(screen.getAllByText('Compatibilidade de nível')).toHaveLength(2);
    expect(
      screen.queryByText('Sua próxima conexão começa aqui'),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText('ENCONTRE O JOGO CERTO')).not.toBeOnTheScreen();
    expect(screen.getByText('Atualizar')).toBeOnTheScreen();
  });

  it('limpa o aviso de sugestões novas do Início ao abrir', async () => {
    mockApi();
    // A aba monta depois do aviso existir (como ao tocar em "Para você").
    function Host() {
      const [open, setOpen] = useState(false);
      return open ? (
        <RecommendationsScreen />
      ) : (
        <Pressable onPress={() => setOpen(true)}>
          <Text>abrir</Text>
        </Pressable>
      );
    }
    const { queryClient } = renderWithQuery(<Host />);
    queryClient.setQueryData(noticeKey, { sportId: 1, players: 2, matches: 0 });
    fireEvent.press(screen.getByText('abrir'));
    await screen.findByText('1 sugestão para você');
    expect(queryClient.getQueryData(noticeKey)).toBeNull();
  });

  it('Atualizar gera com os parâmetros da geração exibida', async () => {
    const spy = mockApi();
    renderWithQuery(<RecommendationsScreen />);
    fireEvent.press(await screen.findByText('Atualizar'));
    await waitFor(() =>
      expect(generations(spy)).toContainEqual(
        expect.objectContaining({
          method: 'POST',
          url: '/v1/recommendations/players',
          data: { sportId: 1, teamSize: 2, mode: 'SAME_GENDER', limit: 10 },
        }),
      ),
    );
  });

  it('Ajustar busca abre a folha com o formulário e gera com os valores dele', async () => {
    const spy = mockApi();
    renderWithQuery(<RecommendationsScreen />);
    fireEvent.press(await screen.findByText('Ajustar busca'));
    fireEvent.press(await screen.findByText('Buscar sugestões'));
    await waitFor(() =>
      expect(generations(spy)).toContainEqual(
        expect.objectContaining({ url: '/v1/recommendations/players' }),
      ),
    );
  });

  it('trocar Jogadores/Partidas não chama a API; trocar a modalidade chama', async () => {
    const tennis = makeSport({ id: 2, slug: 'tenis', name: 'Tênis' });
    const spy = mockApi(
      (c) =>
        c.url === '/v1/sports'
          ? { status: 200, data: { data: [makeSport(), tennis] } }
          : undefined,
      [
        makePlayerProfile(),
        makePlayerProfile({
          id: '8f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e51',
          sportId: 2,
          isPrincipal: false,
          sport: tennis,
        }),
      ],
    );
    renderWithQuery(<RecommendationsScreen />);
    await screen.findByText('1 sugestão para você');
    fireEvent.press(
      within(screen.getByLabelText('Tipo de recomendação')).getByRole(
        'button',
        { name: 'Partidas' },
      ),
    );
    expect(
      await screen.findByText('2 vagas · Time 2 sugerido'),
    ).toBeOnTheScreen();
    expect(generations(spy)).toHaveLength(1);
    fireEvent.press(
      within(screen.getByLabelText('Modalidade')).getByRole('button', {
        name: 'Tênis',
      }),
    );
    await waitFor(() => expect(generations(spy)).toHaveLength(2));
    expect(generations(spy)[1]).toMatchObject({ data: { sportId: 2 } });
  });

  it('expõe o modo técnico e abre o convite restrito ao escopo da busca', async () => {
    const spy = mockApi();
    renderWithQuery(<RecommendationsScreen />);
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

  it('depois de se candidatar, voltar para Partidas relê o feed (a partida não volta)', async () => {
    const spy = mockApi();
    confirmApply();
    renderWithQuery(<RecommendationsScreen />);
    fireEvent.press(await screen.findByText('Partidas'));
    fireEvent.press(await screen.findByText('Candidatar-me'));
    expect(await screen.findByText('Candidatura enviada')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Jogadores'));
    fireEvent.press(screen.getByText('Partidas'));
    await waitFor(() =>
      expect(
        generations(spy).filter((c) => c.url === '/v1/recommendations/refresh'),
      ).toHaveLength(2),
    );
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
    fireEvent.press(await screen.findByText('Candidatar-me'));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByText('Candidatar-me')).toBeOnTheScreen();
    expect(screen.queryByText('Candidatura enviada')).not.toBeOnTheScreen();
  });

  it('sem disponibilidade, partidas vêm vazias com o caminho para cadastrar', async () => {
    mockApi(
      refreshWith(
        makeFeed({
          generated: [],
          matches: makeMatchRecommendations([], {
            availability: 'NOT_CONFIGURED',
          }),
        }),
      ),
    );
    renderWithQuery(<RecommendationsScreen />);
    fireEvent.press(await screen.findByText('Partidas'));
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

  it('erro de regra em um tipo aparece só nele, com o caminho para corrigir', async () => {
    mockApi(
      refreshWith(
        makeFeed({
          generated: [],
          players: {
            error: {
              code: 'RATING_INITIALIZATION_REQUIRED',
              message: 'Atualize a categoria',
            },
          },
        }),
      ),
    );
    renderWithQuery(<RecommendationsScreen />);
    expect(
      await screen.findByText(
        'Defina sua categoria nesta modalidade para inicializar o rating e receber recomendações.',
      ),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Revisar categoria'));
    expect(mockPush).toHaveBeenCalledWith('/sports');
    fireEvent.press(screen.getByText('Partidas'));
    expect(await screen.findByText('1 sugestão para você')).toBeOnTheScreen();
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
