import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { api } from '@/lib/api-client';
import {
  makeMatch,
  makeMyApplication,
  makeMyInvite,
  makePage,
  makeUser,
} from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import { MineScreen } from './mine-screen';

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

type Config = {
  method?: string;
  url?: string;
  params?: unknown;
};
const draft = makeMatch({ status: 'DRAFT', title: 'Rascunho de padel' });
const mockApi = () =>
  jest.spyOn(api, 'request').mockImplementation((config: Config) => {
    const url = String(config.url);
    if (config.method === 'DELETE')
      return Promise.resolve({ status: 204, data: '' });
    if (url.endsWith('/publish'))
      return Promise.resolve({
        status: 200,
        data: { data: { ...draft, status: 'OPEN' } },
      });
    if (url === '/v1/users/me/invites')
      return Promise.resolve({
        status: 200,
        data: makePage([makeMyInvite()]),
      });
    if (url === '/v1/users/me/applications')
      return Promise.resolve({
        status: 200,
        data: makePage([makeMyApplication()]),
      });
    return Promise.resolve({ status: 200, data: makePage([draft]) });
  });

beforeEach(() => {
  seedToken();
  mockSession({ status: 'signed-in', user: makeUser() });
  mockParams = {};
});
afterEach(() => jest.restoreAllMocks());

describe('MineScreen', () => {
  it('lista minhas partidas e publica um rascunho direto do card', async () => {
    const spy = mockApi();
    renderWithQuery(<MineScreen />);
    expect(await screen.findByText('Rascunho de padel')).toBeOnTheScreen();
    expect(screen.getByText('Rascunho')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Publicar'));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ url: `/v1/matches/${draft.id}/publish` }),
      ),
    );
    const list = spy.mock.calls
      .map(([c]) => c as Config)
      .find((c) => c.url === '/v1/matches/mine');
    expect(list?.params).toMatchObject({ role: 'all', limit: 20 });
  });

  it('filtra minhas partidas pela folha e grava nos params', async () => {
    mockApi();
    renderWithQuery(<MineScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Filtrar' }));
    fireEvent.press(screen.getByRole('button', { name: 'Meu papel' }));
    fireEvent.press(screen.getByText('Que eu organizo'));
    fireEvent.press(screen.getByText('Aplicar filtros'));
    expect(mockSetParams).toHaveBeenCalledWith({
      view: 'matches',
      role: 'creator',
      box: 'received',
      status: '',
    });
  });

  it('remove um filtro ativo em um toque', async () => {
    mockParams = { view: 'matches', role: 'creator' };
    mockApi();
    renderWithQuery(<MineScreen />);
    fireEvent.press(
      await screen.findByLabelText('Remover filtro Que eu organizo'),
    );
    expect(mockSetParams).toHaveBeenCalledWith({
      view: 'matches',
      role: 'all',
      box: 'received',
      status: '',
    });
  });

  it('remove só a situação ou limpa todos os filtros ativos', async () => {
    mockParams = { view: 'matches', role: 'creator', status: 'OPEN' };
    mockApi();
    renderWithQuery(<MineScreen />);
    fireEvent.press(await screen.findByLabelText('Remover filtro Aberta'));
    expect(mockSetParams).toHaveBeenCalledWith({
      view: 'matches',
      role: 'creator',
      box: 'received',
      status: '',
    });
    fireEvent.press(screen.getByText('Limpar tudo'));
    expect(mockSetParams).toHaveBeenCalledWith({
      view: 'matches',
      role: 'all',
      box: 'received',
      status: '',
    });
  });

  it('oferece situação da candidatura na folha sem campo de papel', async () => {
    mockParams = { view: 'applications' };
    mockApi();
    renderWithQuery(<MineScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Filtrar' }));
    expect(screen.queryByRole('button', { name: 'Meu papel' })).toBeNull();
    fireEvent.press(
      screen.getByRole('button', { name: 'Situação da candidatura' }),
    );
    fireEvent.press(screen.getByRole('button', { name: 'Recusada' }));
    fireEvent.press(screen.getByText('Aplicar filtros'));
    expect(mockSetParams).toHaveBeenCalledWith({
      view: 'applications',
      role: 'all',
      box: 'received',
      status: 'DECLINED',
    });
  });

  it('oferece caixa e situação de convite na folha', async () => {
    mockParams = { view: 'invites' };
    mockApi();
    renderWithQuery(<MineScreen />);
    fireEvent.press(await screen.findByRole('button', { name: 'Filtrar' }));
    fireEvent.press(screen.getByRole('button', { name: 'Caixa' }));
    fireEvent.press(screen.getByText('Enviados'));
    fireEvent.press(
      screen.getByRole('button', { name: 'Situação do convite' }),
    );
    fireEvent.press(screen.getByText('Recusado'));
    fireEvent.press(screen.getByText('Aplicar filtros'));
    expect(mockSetParams).toHaveBeenCalledWith({
      view: 'invites',
      role: 'all',
      box: 'sent',
      status: 'DECLINED',
    });
  });

  it('mostra um só botão de filtro, sem as linhas de chips', async () => {
    mockApi();
    renderWithQuery(<MineScreen />);
    expect(
      await screen.findByRole('button', { name: 'Filtrar' }),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText('Meu papel')).toBeNull();
    expect(screen.queryByLabelText('Situação')).toBeNull();
  });

  it('mostra o chip e permite limpar filtros no vazio', async () => {
    mockParams = { role: 'creator' };
    jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 200, data: makePage([]) });
    renderWithQuery(<MineScreen />);
    expect(await screen.findByText('Limpar filtros')).toBeOnTheScreen();
    expect(screen.getByText('Explorar partidas')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Filtrar (1)' }),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Limpar filtros'));
    expect(mockSetParams).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'all', status: '' }),
    );
  });

  it('oferece limpar situação antes de explorar no vazio de candidaturas', async () => {
    mockParams = { view: 'applications', status: 'PENDING' };
    jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 200, data: makePage([]) });
    renderWithQuery(<MineScreen />);
    expect(
      await screen.findByText('Nenhuma candidatura por aqui'),
    ).toBeOnTheScreen();
    const clear = screen.getByRole('button', { name: 'Limpar filtros' });
    expect(screen.getByText('Explorar partidas abertas')).toBeOnTheScreen();
    fireEvent.press(clear);
    expect(mockSetParams).toHaveBeenCalledWith({
      view: 'applications',
      role: 'all',
      box: 'received',
      status: '',
    });
  });

  it('não oferece limpar no vazio de candidaturas sem filtro', async () => {
    mockParams = { view: 'applications' };
    jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 200, data: makePage([]) });
    renderWithQuery(<MineScreen />);
    expect(
      await screen.findByText('Nenhuma candidatura por aqui'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
  });

  it('troca para candidaturas e retira uma pendente após confirmar', async () => {
    mockParams = { view: 'applications' };
    const spy = mockApi();
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    renderWithQuery(<MineScreen />);
    fireEvent.press(await screen.findByText('Retirar candidatura'));
    expect(screen.getByText('Pendente')).toBeOnTheScreen();
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: `/v1/matches/${makeMyApplication().match.id}/applications/me`,
        }),
      ),
    );
  });

  it('o segmento troca a visão pelos params', async () => {
    mockApi();
    renderWithQuery(<MineScreen />);
    fireEvent.press(await screen.findByRole('tab', { name: 'Candidaturas' }));
    expect(mockSetParams).toHaveBeenCalledWith({
      view: 'applications',
      role: 'all',
      box: 'received',
      status: '',
    });
    fireEvent.press(screen.getByRole('tab', { name: 'Convites' }));
    expect(mockSetParams).toHaveBeenLastCalledWith({
      view: 'invites',
      role: 'all',
      box: 'received',
      status: '',
    });
  });

  it('o segmento Convites mostra a caixa de convites (T31)', async () => {
    mockParams = { view: 'invites' };
    mockApi();
    renderWithQuery(<MineScreen />);
    expect(
      await screen.findByText(
        'Quem chamou você para jogar e quem você chamou.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Filtrar' })).toBeOnTheScreen();
    expect(screen.queryByLabelText('Caixa')).toBeNull();
    // Ana (usuária) é a convidante do fixture: só cancela.
    expect(
      await screen.findByLabelText('Cancelar convite para Bruno'),
    ).toBeOnTheScreen();
  });

  it('mostra o vazio por papel', async () => {
    mockParams = { role: 'creator' };
    jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 200, data: makePage([]) });
    renderWithQuery(<MineScreen />);
    expect(
      await screen.findByText('Você ainda não organizou partidas'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Criar partida'));
    expect(mockPush).toHaveBeenCalledWith('/matches/new');
  });

  it('mostra erro com nova tentativa', async () => {
    jest.spyOn(api, 'request').mockRejectedValue(new Error('rede'));
    renderWithQuery(<MineScreen />);
    expect(await screen.findByText('Tentar novamente')).toBeOnTheScreen();
  });
});
