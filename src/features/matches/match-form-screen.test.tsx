import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { toast } from 'sonner-native';

import { api } from '@/lib/api-client';
import {
  makeMatchDetail,
  makePlayerProfile,
  makeSport,
  makeUser,
} from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import type { MatchDetail } from './api';
import { CreateMatchScreen, EditMatchScreen } from './match-form-screen';

jest.mock('@/features/auth/session');
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));

type Config = { method?: string; url?: string; data?: unknown };
const padel = makeSport();
const tenis = makeSport({
  id: 2,
  slug: 'tenis',
  name: 'Tênis',
  defaultTeamSize: 1,
  supportsSingles: true,
  requiresSidePreference: false,
});
const detail = makeMatchDetail();
const mockApi = (match: MatchDetail = detail) =>
  jest.spyOn(api, 'request').mockImplementation((config: Config) => {
    const url = String(config.url);
    if (url === '/v1/sports')
      return Promise.resolve({ status: 200, data: { data: [padel, tenis] } });
    if (url.includes('sport-profiles'))
      return Promise.resolve({
        status: 200,
        data: { data: [makePlayerProfile()] },
      });
    if (url.includes('/cities'))
      return Promise.resolve({
        status: 200,
        data: { data: ['Florianópolis', 'Blumenau'] },
      });
    if (config.method === 'POST')
      return Promise.resolve({
        status: 201,
        data: {
          data: {
            ...match,
            status: (config.data as { status: string }).status,
          },
        },
      });
    if (config.method === 'PATCH')
      return Promise.resolve({ status: 200, data: { data: match } });
    return Promise.resolve({ status: 200, data: { data: match } });
  });
const postedBody = (spy: jest.SpyInstance, method: string) =>
  spy.mock.calls
    .map(([config]) => config as Config)
    .find((c) => c.method === method)?.data as Record<string, unknown>;

beforeEach(() => {
  seedToken();
  mockParams = { matchId: detail.id };
  mockSession({ status: 'signed-in', user: makeUser() });
});
afterEach(() => jest.restoreAllMocks());

describe('CreateMatchScreen', () => {
  it('começa pela modalidade principal com formato 2v2 e a cidade do usuário', async () => {
    mockApi();
    renderWithQuery(<CreateMatchScreen />);
    expect(
      await screen.findByText('Marque a próxima partida.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Formato 2v2')).toBeSelected();
    expect(screen.getByRole('button', { name: 'Cidade' })).toHaveTextContent(
      'Florianópolis',
    );
    // Só as modalidades do perfil entram nos chips; o Tênis vira convite ao perfil.
    expect(screen.queryByText('Tênis')).not.toBeOnTheScreen();
    expect(screen.getByText('Adicionar modalidade')).toBeOnTheScreen();
  });

  it('exige o local antes de publicar', async () => {
    const spy = mockApi();
    renderWithQuery(<CreateMatchScreen />);
    fireEvent.press(await screen.findByText('Publicar partida'));
    expect(
      await screen.findByText('Informe o local da partida'),
    ).toBeOnTheScreen();
    expect(spy.mock.calls.some(([c]) => (c as Config).method === 'POST')).toBe(
      false,
    );
  });

  it('publica com status OPEN e vai para o detalhe', async () => {
    const spy = mockApi();
    renderWithQuery(<CreateMatchScreen />);
    fireEvent.changeText(await screen.findByLabelText('Local'), 'Quadra 2');
    fireEvent.press(screen.getByText('Publicar partida'));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(`/matches/${detail.id}`),
    );
    expect(postedBody(spy, 'POST')).toMatchObject({
      sportId: 1,
      teamSize: 2,
      status: 'OPEN',
      visibility: 'PUBLIC',
      genderPolicy: 'FEMALE',
      locationText: 'Quadra 2',
      city: 'Florianópolis',
      state: 'SC',
      durationMinutes: 90,
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Partida publicada. Agora é só esperar as candidaturas.',
    );
  });

  it('salva como rascunho com visibilidade privada', async () => {
    const spy = mockApi();
    renderWithQuery(<CreateMatchScreen />);
    fireEvent.changeText(await screen.findByLabelText('Local'), 'Quadra 2');
    fireEvent.press(screen.getByLabelText('Visibilidade Privada'));
    fireEvent.press(screen.getByText('Salvar como rascunho'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(postedBody(spy, 'POST')).toMatchObject({
      status: 'DRAFT',
      visibility: 'PRIVATE',
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Rascunho salvo. Publique quando quiser.',
    );
  });
});

describe('EditMatchScreen', () => {
  it('envia só o que mudou e volta ao detalhe', async () => {
    const spy = mockApi();
    renderWithQuery(<EditMatchScreen />);
    const title = await screen.findByLabelText('Título (opcional)');
    expect(title.props.value).toBe('Padel de sábado');
    fireEvent.changeText(title, 'Novo título');
    fireEvent.press(screen.getByText('Salvar alterações'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(postedBody(spy, 'PATCH')).toEqual({ title: 'Novo título' });
  });

  it('trava modalidade e formato quando já há outro jogador', async () => {
    mockApi({
      ...detail,
      capacity: { teamSize: 2, total: 4, confirmed: 2, available: 2 },
    });
    renderWithQuery(<EditMatchScreen />);
    expect(
      await screen.findByText(/Modalidade e formato não mudam/),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText('Formato 2v2')).not.toBeOnTheScreen();
  });

  it('bloqueia a edição de partida confirmada com o motivo', async () => {
    mockApi({ ...detail, status: 'CONFIRMED' });
    renderWithQuery(<EditMatchScreen />);
    expect(
      await screen.findByText('Esta partida não pode mais ser editada'),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Times completos/)).toBeOnTheScreen();
  });
});
