import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { toast } from 'sonner-native';

import { api, ApiError } from '@/lib/api-client';
import {
  makeApplication,
  makeInvite,
  makeMatchDetail,
  makeMatchResult,
  makeUser,
  otherPlayer,
} from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import type { MatchDetail } from './api';
import { MatchDetailScreen } from './match-detail-screen';

jest.mock('@/features/auth/session');
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(effect, [effect]);
  },
}));

type Config = { method?: string; url?: string; data?: unknown };
const detail = makeMatchDetail();
const outsider = makeMatchDetail({
  viewer: { isCreator: false, participation: null, invite: null },
});
const mockApi = (match: MatchDetail, applications = [makeApplication()]) =>
  jest.spyOn(api, 'request').mockImplementation((config: Config) => {
    const url = String(config.url);
    if (config.method === 'DELETE')
      return Promise.resolve({ status: 204, data: '' });
    if (url.endsWith('/applications') && config.method === 'GET')
      return Promise.resolve({ status: 200, data: { data: applications } });
    if (url.endsWith('/applications') && config.method === 'POST')
      return Promise.resolve({
        status: 201,
        data: { data: makeApplication({ teamIndex: 2 }) },
      });
    if (url.includes('/invites/') && config.method === 'POST')
      return Promise.resolve({
        status: 200,
        data: {
          data: makeInvite({
            status: url.endsWith('/accept') ? 'ACCEPTED' : 'DECLINED',
            teamIndex: (config.data as { teamIndex?: 1 | 2 })?.teamIndex ?? 2,
          }),
        },
      });
    if (url.endsWith('/publish'))
      return Promise.resolve({
        status: 200,
        data: { data: { ...match, status: 'OPEN' } },
      });
    if (url.endsWith('/cancel'))
      return Promise.resolve({
        status: 200,
        data: {
          data: {
            ...match,
            status: 'CANCELLED',
            cancelledReason: (config.data as { reason: string | null }).reason,
          },
        },
      });
    return Promise.resolve({ status: 200, data: { data: match } });
  });

beforeEach(() => {
  seedToken();
  mockSession({ status: 'signed-in', user: makeUser() });
  mockParams = { matchId: detail.id };
});
const invited = makeMatchDetail({
  viewer: {
    isCreator: false,
    participation: null,
    invite: { id: makeInvite().id, status: 'PENDING', teamIndex: null },
  },
});
afterEach(() => jest.restoreAllMocks());

describe('MatchDetailScreen', () => {
  it('mostra carregando e depois o detalhe com os fatos', async () => {
    mockApi(detail);
    renderWithQuery(<MatchDetailScreen />);
    expect(screen.getByRole('progressbar')).toBeOnTheScreen();
    expect(await screen.findByText('Padel de sábado')).toBeOnTheScreen();
    expect(
      screen.getAllByText('Quadra 2 do Parque Ramiro Ruediger'),
    ).toHaveLength(2);
    expect(screen.getByText('Feminina')).toBeOnTheScreen();
    expect(screen.getByText('1h30')).toBeOnTheScreen();
  });

  it('trata 404 (privada ou inexistente) como indisponível', async () => {
    jest
      .spyOn(api, 'request')
      .mockRejectedValue(new ApiError('MATCH_NOT_FOUND', 404));
    renderWithQuery(<MatchDetailScreen />);
    expect(
      await screen.findByText('Esta partida não está disponível'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Explorar partidas'));
    expect(mockReplace).toHaveBeenCalledWith('/matches');
  });

  it('id inválido não chama a API', () => {
    mockParams = { matchId: 'abc' };
    const spy = jest.spyOn(api, 'request');
    renderWithQuery(<MatchDetailScreen />);
    expect(
      screen.getByText('Esta partida não está disponível'),
    ).toBeOnTheScreen();
    expect(spy).not.toHaveBeenCalled();
  });

  it('terceiro se candidata tocando numa vaga e confirmando', async () => {
    const spy = mockApi(outsider);
    renderWithQuery(<MatchDetailScreen />);
    fireEvent.press(
      (await screen.findAllByLabelText('Quero jogar no Time 2'))[0],
    );
    expect(
      await screen.findByText('Candidatar-se ao Time 2'),
    ).toBeOnTheScreen();
    expect(
      spy.mock.calls.filter(([config]) => (config as Config).method === 'POST'),
    ).toHaveLength(0);
    fireEvent.press(screen.getByText('Confirmar candidatura'));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const posts = spy.mock.calls
      .map(([config]) => config as Config)
      .filter((c) => c.method === 'POST');
    expect(posts[0]).toMatchObject({
      url: `/v1/matches/${detail.id}/applications`,
      data: { teamIndex: 2 },
    });
    expect(screen.queryByText('Gerenciar')).not.toBeOnTheScreen();
    expect(screen.queryByText('Aguardando decisão')).not.toBeOnTheScreen();
  });

  it('atualiza candidatura, aprovação e elenco confirmado sem sair do detalhe', async () => {
    let phase: 'available' | 'pending' | 'confirmed' = 'available';
    let role: 'candidate' | 'creator' = 'candidate';
    const spy = jest
      .spyOn(api, 'request')
      .mockImplementation((config: Config) => {
        const url = String(config.url);
        if (url.endsWith('/applications') && config.method === 'POST') {
          phase = 'pending';
          return Promise.resolve({
            status: 201,
            data: { data: makeApplication() },
          });
        }
        if (url.endsWith('/applications') && config.method === 'GET')
          return Promise.resolve({
            status: 200,
            data: { data: phase === 'pending' ? [makeApplication()] : [] },
          });
        if (url.endsWith('/approve') && config.method === 'POST') {
          phase = 'confirmed';
          return Promise.resolve({
            status: 200,
            data: { data: makeApplication({ status: 'CONFIRMED' }) },
          });
        }
        const viewer =
          role === 'creator'
            ? detail.viewer
            : {
                isCreator: false,
                invite: null,
                participation:
                  phase === 'available'
                    ? null
                    : {
                        id: makeApplication().id,
                        status:
                          phase === 'pending'
                            ? ('PENDING' as const)
                            : ('CONFIRMED' as const),
                        teamIndex: 2 as const,
                      },
              };
        const teams =
          phase === 'confirmed'
            ? [
                detail.teams[0],
                {
                  ...detail.teams[1],
                  participants: [
                    {
                      id: makeApplication().id,
                      user: otherPlayer,
                      isCreator: false,
                      joinedAt: makeApplication().joinedAt,
                    },
                  ],
                },
              ]
            : detail.teams;
        const match = makeMatchDetail({
          viewer,
          teams,
          capacity: {
            teamSize: 2,
            total: 4,
            confirmed: phase === 'confirmed' ? 2 : 1,
            available: phase === 'confirmed' ? 2 : 3,
          },
        });
        return Promise.resolve({ status: 200, data: { data: match } });
      });

    const candidate = renderWithQuery(<MatchDetailScreen />);
    fireEvent.press(
      (await screen.findAllByLabelText('Quero jogar no Time 2'))[0],
    );
    fireEvent.press(screen.getByText('Confirmar candidatura'));
    await waitFor(() => expect(phase).toBe('pending'));
    await waitFor(() =>
      expect(
        screen.getByText('Sua candidatura · Aguardando aprovação'),
      ).toBeOnTheScreen(),
    );
    expect(screen.getByText('1 de 4 confirmados')).toBeOnTheScreen();
    candidate.unmount();

    role = 'creator';
    const creator = renderWithQuery(<MatchDetailScreen />);
    fireEvent.press(await screen.findByLabelText('Aprovar Bruno no Time 2'));
    await waitFor(() => expect(phase).toBe('confirmed'));
    await waitFor(() =>
      expect(screen.getByText('2 de 4 confirmados')).toBeOnTheScreen(),
    );
    expect(screen.getByText(otherPlayer.fullName)).toBeOnTheScreen();
    creator.unmount();

    role = 'candidate';
    renderWithQuery(<MatchDetailScreen />);
    expect(
      await screen.findByText(/Você está confirmado no Time 2/),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText('Sua candidatura · Aguardando aprovação'),
    ).not.toBeOnTheScreen();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `/v1/matches/${detail.id}/applications`,
        method: 'POST',
        data: { teamIndex: 2 },
      }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `/v1/matches/${detail.id}/applications/${makeApplication().id}/approve`,
        method: 'POST',
        data: { teamIndex: 2 },
      }),
    );
  });

  it.each([
    ['TEAM_FULL', 409],
    ['GENDER_INCOMPATIBLE', 409],
    ['RATE_LIMITED', 429],
    ['MATCH_NOT_OPEN', 409],
  ])(
    'explica %s na folha da vaga e mantém a partida visível',
    async (code, status) => {
      jest
        .spyOn(api, 'request')
        .mockImplementation((config: Config) =>
          config.method === 'POST'
            ? Promise.reject(new ApiError(code, status))
            : Promise.resolve({ status: 200, data: { data: outsider } }),
        );
      renderWithQuery(<MatchDetailScreen />);
      fireEvent.press(
        (await screen.findAllByLabelText('Quero jogar no Time 2'))[0],
      );
      fireEvent.press(screen.getByText('Confirmar candidatura'));
      expect(
        await screen.findByText(new ApiError(code, status).message),
      ).toBeOnTheScreen();
      expect(screen.getByText('Candidatar-se ao Time 2')).toBeOnTheScreen();
      expect(screen.getByText('Padel de sábado')).toBeOnTheScreen();
    },
  );

  it('terceiro em partida privada vê o motivo e nenhuma ação', async () => {
    mockApi({ ...outsider, visibility: 'PRIVATE' });
    renderWithQuery(<MatchDetailScreen />);
    expect(
      await screen.findByText('Partida privada: a entrada é só por convite.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Candidatar-se')).not.toBeOnTheScreen();
    expect(screen.queryByText('Quero jogar aqui')).not.toBeOnTheScreen();
  });

  it('candidato pendente retira a candidatura após confirmar', async () => {
    const spy = mockApi({
      ...outsider,
      viewer: {
        isCreator: false,
        invite: null,
        participation: {
          id: detail.teams[0].participants[0].id,
          status: 'PENDING',
          teamIndex: 2,
        },
      },
    });
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_t, _m, buttons) => {
        buttons?.find((b) => b.style === 'destructive')?.onPress?.();
      });
    renderWithQuery(<MatchDetailScreen />);
    expect(
      await screen.findByText(
        'Candidatura enviada. O criador vai decidir em breve.',
      ),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Retirar candidatura'));
    expect(alert).toHaveBeenCalled();
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: `/v1/matches/${detail.id}/applications/me`,
        }),
      ),
    );
  });

  it('convidado aceita pelo banner ou pela vaga e recusa após confirmar (T31)', async () => {
    const spy = mockApi(invited);
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    renderWithQuery(<MatchDetailScreen />);
    expect(
      await screen.findByText(/Ana convidou você para esta partida\./),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Candidatar-se')).not.toBeOnTheScreen();
    fireEvent.press(screen.getAllByLabelText('Entrar no Time 2')[0]);
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `/v1/matches/${detail.id}/invites/${makeInvite().id}/accept`,
          data: { teamIndex: 2 },
        }),
      ),
    );
    fireEvent.press(screen.getByText('Aceitar convite'));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringMatching(/\/accept$/),
          data: {},
        }),
      ),
    );
    fireEvent.press(screen.getByText('Recusar'));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.stringMatching(/\/decline$/) }),
      ),
    );
  });

  it('convidado em partida lotada vê o motivo e só pode recusar (T31)', async () => {
    mockApi({
      ...invited,
      status: 'CONFIRMED',
      capacity: { teamSize: 2, total: 4, confirmed: 4, available: 0 },
    });
    renderWithQuery(<MatchDetailScreen />);
    expect(
      await screen.findByText(/Os times já estão completos\./),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Aceitar convite')).not.toBeOnTheScreen();
    expect(screen.getByText('Recusar')).toBeOnTheScreen();
  });

  it('membro vê "Registrar placar" só quando a partida confirmada já passou (T31)', async () => {
    const confirmed = makeMatchDetail({
      status: 'CONFIRMED',
      scheduledAt: '2026-09-01T18:00:00.000Z',
    });
    mockApi(confirmed);
    renderWithQuery(<MatchDetailScreen />);
    fireEvent.press(await screen.findByText('Registrar placar'));
    expect(mockPush).toHaveBeenCalledWith(`/matches/${detail.id}/result`);
  });

  it('partida confirmada no futuro explica a espera pelo placar (T31)', async () => {
    mockApi(makeMatchDetail({ status: 'CONFIRMED' }));
    renderWithQuery(<MatchDetailScreen />);
    expect(
      await screen.findByText(/O placar pode ser registrado depois do horário/),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Registrar placar')).not.toBeOnTheScreen();
  });

  it('partida encerrada mostra o placar final e a situação do rating (T31)', async () => {
    mockApi(
      makeMatchDetail({
        status: 'COMPLETED',
        scheduledAt: '2026-09-01T18:00:00.000Z',
        result: makeMatchResult({ notes: 'Jogo duro' }),
      }),
    );
    renderWithQuery(<MatchDetailScreen />);
    expect(
      await screen.findByText('Time 1 vence por 2 sets a 0'),
    ).toBeOnTheScreen();
    expect(screen.getByText('6-4 · 6-3')).toBeOnTheScreen();
    expect(screen.getByText('Set 2')).toBeOnTheScreen();
    expect(screen.getByLabelText('Vencedor')).toBeOnTheScreen();
    expect(screen.getByText('Jogo duro')).toBeOnTheScreen();
    expect(
      screen.getByText(/Registrado por Ana Clara Souza/),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'O rating Glicko-2 desta partida ainda não foi processado.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Registrar placar')).not.toBeOnTheScreen();
  });

  it('placar processado mostra a data do rating (T31)', async () => {
    mockApi(
      makeMatchDetail({
        status: 'COMPLETED',
        result: makeMatchResult({
          ratingsProcessedAt: '2026-09-13T00:00:05.000Z',
        }),
      }),
    );
    renderWithQuery(<MatchDetailScreen />);
    expect(
      await screen.findByText(/Rating Glicko-2 atualizado em/),
    ).toBeOnTheScreen();
  });

  it('criador de rascunho publica e vê editar/cancelar', async () => {
    const spy = mockApi({ ...detail, status: 'DRAFT' });
    renderWithQuery(<MatchDetailScreen />);
    expect(await screen.findByText('Gerenciar')).toBeOnTheScreen();
    expect(screen.getByText('Editar partida')).toBeOnTheScreen();
    expect(screen.getByText('Cancelar partida')).toBeOnTheScreen();
    // Rascunho não gerencia candidaturas ainda.
    expect(screen.queryByText('Candidaturas')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText('Publicar partida'));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ url: `/v1/matches/${detail.id}/publish` }),
      ),
    );
    fireEvent.press(screen.getByText('Editar partida'));
    expect(mockPush).toHaveBeenCalledWith(`/matches/${detail.id}/edit`);
  });

  it('criador de partida aberta vê as candidaturas e cancela com motivo', async () => {
    const spy = mockApi(detail);
    renderWithQuery(<MatchDetailScreen />);
    expect(await screen.findByText(otherPlayer.fullName)).toBeOnTheScreen();
    expect(screen.getByText(/Aguardando decisão/)).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Cancelar partida'));
    fireEvent.changeText(
      await screen.findByLabelText('Motivo (opcional)'),
      'Chuva',
    );
    fireEvent.press(screen.getAllByText('Cancelar partida')[1]);
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `/v1/matches/${detail.id}/cancel`,
          data: { reason: 'Chuva' },
        }),
      ),
    );
  });

  it('criador vê o painel de convites e abre a folha de convite (T31)', async () => {
    mockApi(detail);
    renderWithQuery(<MatchDetailScreen />);
    expect(await screen.findByText('Convites da partida')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Convidar amigo para o Time 1'));
    expect(await screen.findByText('Quem você quer chamar?')).toBeOnTheScreen();
  });

  it('criador de partida confirmada vê o painel sem "Convidar jogador" (T31)', async () => {
    mockApi({
      ...detail,
      status: 'CONFIRMED',
      capacity: { teamSize: 2, total: 4, confirmed: 4, available: 0 },
    });
    renderWithQuery(<MatchDetailScreen />);
    expect(await screen.findByText('Convites da partida')).toBeOnTheScreen();
    expect(screen.queryByText('Convidar jogador')).not.toBeOnTheScreen();
  });

  it('partida cancelada mostra o motivo e não oferece ações ao criador', async () => {
    mockApi({ ...detail, status: 'CANCELLED', cancelledReason: 'Chuva forte' });
    renderWithQuery(<MatchDetailScreen />);
    expect(await screen.findByText('Chuva forte')).toBeOnTheScreen();
    expect(screen.queryByText('Gerenciar')).not.toBeOnTheScreen();
    expect(screen.queryByText('Candidaturas')).not.toBeOnTheScreen();
    expect(
      screen.getByText('Partida cancelada: nenhuma ação disponível.'),
    ).toBeOnTheScreen();
  });
});
