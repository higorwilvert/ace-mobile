import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { toast } from 'sonner-native';

import { api, ApiError } from '@/lib/api-client';
import { makeMatchDetail, makeMatchResult, otherPlayer } from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { seedToken } from '@/test/session-mock';

import { ResultScreen } from './result-screen';

const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));

type Config = { method?: string; url?: string; data?: unknown };
/** Partida 1v1 confirmada, já jogada, vista por Bruno (confirmado no Time 2). */
const playable = makeMatchDetail({
  teamSize: 1,
  status: 'CONFIRMED',
  scheduledAt: '2026-09-01T18:00:00.000Z',
  capacity: { teamSize: 1, total: 2, confirmed: 2, available: 0 },
  viewer: {
    isCreator: false,
    participation: {
      id: '88888888-8888-4888-8888-888888888888',
      status: 'CONFIRMED',
      teamIndex: 2,
    },
    invite: null,
  },
});
playable.teams[1].participants.push({
  id: '99999999-9999-4999-8999-999999999999',
  user: otherPlayer,
  isCreator: false,
  joinedAt: '2026-08-30T12:00:00.000Z',
  tier: null,
});
const mockApi = (match = playable, post: 'ok' | 409 = 'ok') =>
  jest.spyOn(api, 'request').mockImplementation((config: Config) => {
    if (config.method === 'POST')
      return post === 'ok'
        ? Promise.resolve({ status: 201, data: { data: makeMatchResult() } })
        : Promise.reject(new ApiError('RESULT_ALREADY_RECORDED', 409));
    return Promise.resolve({ status: 200, data: { data: match } });
  });
const confirm = () =>
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
    buttons?.find((b) => b.text === 'Registrar')?.onPress?.();
  });

beforeEach(() => {
  seedToken();
  mockParams = { matchId: playable.id };
});
afterEach(() => jest.restoreAllMocks());

describe('ResultScreen', () => {
  it('deriva o desfecho ao vivo e envia o payload do RF23 após confirmar', async () => {
    const spy = mockApi();
    confirm();
    renderWithQuery(<ResultScreen />);
    expect(
      await screen.findByText('Preencha os sets para ver o desfecho.'),
    ).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('Set 1, Ana Clara Souza'), '6');
    fireEvent.changeText(screen.getByLabelText('Set 1, Bruno Lima'), '4');
    expect(
      screen.getByText('Ana Clara Souza vence por 1 set a 0'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Adicionar set'));
    fireEvent.changeText(screen.getByLabelText('Set 2, Ana Clara Souza'), '3');
    fireEvent.changeText(screen.getByLabelText('Set 2, Bruno Lima'), '6');
    expect(screen.getByText('Empate: 1 set a 1')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Adicionar set'));
    fireEvent.changeText(screen.getByLabelText('Set 3, Ana Clara Souza'), '7');
    fireEvent.changeText(screen.getByLabelText('Set 3, Bruno Lima'), '6');
    fireEvent.press(screen.getAllByText('+ tiebreak')[2]);
    fireEvent.changeText(
      screen.getByLabelText('Tiebreak do set 3, Ana Clara Souza'),
      '7',
    );
    fireEvent.changeText(
      screen.getByLabelText('Tiebreak do set 3, Bruno Lima'),
      '5',
    );
    fireEvent.changeText(
      screen.getByLabelText('Observações (opcional)'),
      'Jogo duro',
    );
    fireEvent.press(screen.getByText('Registrar placar'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Registrar este placar?',
      expect.any(String),
      expect.any(Array),
    );
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `/v1/matches/${playable.id}/result`,
          data: {
            sets: [
              { team1: 6, team2: 4 },
              { team1: 3, team2: 6 },
              { team1: 7, team2: 6, tiebreak: { team1: 7, team2: 5 } },
            ],
            winnerTeamIndex: 1,
            notes: 'Jogo duro',
          },
        }),
      ),
    );
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalled();
  });

  it('mostra erros por set e não abre a confirmação', async () => {
    mockApi();
    const alert = jest.spyOn(Alert, 'alert');
    renderWithQuery(<ResultScreen />);
    await screen.findByText('Registrar placar');
    fireEvent.press(screen.getByText('Registrar placar'));
    expect(screen.getByText('Informe o placar')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('Set 1, Ana Clara Souza'), '6');
    fireEvent.changeText(screen.getByLabelText('Set 1, Bruno Lima'), '6');
    fireEvent.press(screen.getByText('Registrar placar'));
    expect(
      screen.getByText('Um set não pode terminar empatado'),
    ).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('Set 1, Bruno Lima'), '7');
    fireEvent.press(screen.getByText('+ tiebreak'));
    fireEvent.changeText(
      screen.getByLabelText('Tiebreak do set 1, Ana Clara Souza'),
      '7',
    );
    fireEvent.changeText(
      screen.getByLabelText('Tiebreak do set 1, Bruno Lima'),
      '5',
    );
    fireEvent.press(screen.getByText('Registrar placar'));
    expect(
      screen.getByText('O tiebreak precisa ter o mesmo vencedor do set'),
    ).toBeOnTheScreen();
    expect(alert).not.toHaveBeenCalled();
  });

  it('remove set e tiebreak', async () => {
    mockApi();
    renderWithQuery(<ResultScreen />);
    fireEvent.press(await screen.findByText('Adicionar set'));
    expect(screen.getByText('Set 2')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Remover set 2'));
    expect(screen.queryByText('Set 2')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByText('+ tiebreak'));
    fireEvent.press(screen.getByLabelText('Remover tiebreak do set 1'));
    expect(screen.queryByText('Tiebreak')).not.toBeOnTheScreen();
  });

  it('409 (alguém registrou antes) avisa e volta ao detalhe', async () => {
    mockApi(playable, 409);
    confirm();
    renderWithQuery(<ResultScreen />);
    fireEvent.changeText(
      await screen.findByLabelText('Set 1, Ana Clara Souza'),
      '6',
    );
    fireEvent.changeText(screen.getByLabelText('Set 1, Bruno Lima'), '4');
    fireEvent.press(screen.getByText('Registrar placar'));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(mockBack).toHaveBeenCalled();
  });

  it('sem permissão explica o motivo em vez de mostrar o formulário', async () => {
    mockApi({ ...playable, scheduledAt: '2999-09-19T21:00:00.000Z' });
    renderWithQuery(<ResultScreen />);
    expect(
      await screen.findByText('Ainda não dá para registrar o placar'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'O placar pode ser registrado depois do horário da partida.',
      ),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Voltar'));
    expect(mockBack).toHaveBeenCalled();
  });
});
