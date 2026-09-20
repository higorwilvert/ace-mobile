import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/lib/api-client';
import { makePage, makeUser } from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import { ProfileMenuScreen } from './profile-menu-screen';

jest.mock('@/features/auth/session');
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  useIsFocused: () => true,
}));

// O menu consulta o contador de pendências (T33): API vazia por padrão.
const mockInbox = (requests: { id: string }[] = []) =>
  jest.spyOn(api, 'request').mockImplementation((config: { url?: string }) =>
    Promise.resolve({
      status: 200,
      data: makePage(
        String(config.url).endsWith('/friend-requests') ? requests : [],
      ),
    }),
  );

beforeEach(() => {
  seedToken();
  mockSession({ status: 'signed-in', user: makeUser() });
  mockInbox();
});
afterEach(() => jest.restoreAllMocks());

describe('ProfileMenuScreen', () => {
  it('mostra o jogador e lista os caminhos do perfil', () => {
    renderWithQuery(<ProfileMenuScreen />);
    expect(screen.getByText('Ana Clara Souza')).toBeOnTheScreen();
    expect(screen.getByText('Florianópolis · SC')).toBeOnTheScreen();
    expect(screen.getByText('AS')).toBeOnTheScreen();
    [
      'Dados pessoais',
      'Meus esportes',
      'Disponibilidade',
      'Rating e evolução',
      'Histórico e totais',
      'Jogadores e amigos',
      'Conta',
    ].forEach((item) => expect(screen.getByText(item)).toBeOnTheScreen());
    expect(screen.queryByText('Sair')).not.toBeOnTheScreen();
    expect(screen.queryByText(/T24/)).not.toBeOnTheScreen();
  });

  it('navega para a tela do item tocado', () => {
    renderWithQuery(<ProfileMenuScreen />);
    fireEvent.press(screen.getByText('Meus esportes'));
    expect(mockPush).toHaveBeenCalledWith('/sports');
    fireEvent.press(screen.getByText('Rating e evolução'));
    expect(mockPush).toHaveBeenCalledWith('/rating');
    fireEvent.press(screen.getByText('Histórico e totais'));
    expect(mockPush).toHaveBeenCalledWith('/history');
    fireEvent.press(screen.getByText('Conta'));
    expect(mockPush).toHaveBeenCalledWith('/account');
    fireEvent.press(screen.getByText('Jogadores e amigos'));
    expect(mockPush).toHaveBeenCalledWith('/players');
  });

  it('mostra a pendência de pedidos de amizade no item Jogadores (T33)', async () => {
    mockInbox([{ id: 'r1' }, { id: 'r2' }]);
    renderWithQuery(<ProfileMenuScreen />);
    expect(await screen.findByText('2')).toBeOnTheScreen();
  });
});
