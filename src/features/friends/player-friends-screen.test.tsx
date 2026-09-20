import { screen } from '@testing-library/react-native';

import { api, ApiError } from '@/lib/api-client';
import {
  makeFriend,
  makePage,
  makePublicProfile,
  makeUser,
} from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import { PlayerFriendsScreen } from './player-friends-screen';

const profile = makePublicProfile();
jest.mock('@/features/auth/session');
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({
    userId: '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
  }),
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));
const mockApi = (friends: 'ok' | 'private' | 'empty') =>
  jest.spyOn(api, 'request').mockImplementation((config: { url?: string }) => {
    const url = String(config.url);
    if (url.endsWith('/friends')) {
      if (friends === 'private')
        return Promise.reject(new ApiError('PROFILE_PRIVATE', 403));
      return Promise.resolve({
        status: 200,
        data: makePage(friends === 'ok' ? [makeFriend()] : []),
      });
    }
    return Promise.resolve({ status: 200, data: { data: profile } });
  });

beforeEach(() => {
  seedToken();
  mockSession({ status: 'signed-in', user: makeUser() });
});
afterEach(() => jest.restoreAllMocks());

describe('PlayerFriendsScreen', () => {
  it('lista os amigos do jogador com "Desde" e sem botão de relação', async () => {
    const spy = mockApi('ok');
    renderWithQuery(<PlayerFriendsScreen />);
    expect(await screen.findByText('Bruno Lima')).toBeOnTheScreen();
    expect(screen.getByText(/Desde set\. 2026/)).toBeOnTheScreen();
    expect(screen.getByText('4 amigos no ACE.')).toBeOnTheScreen();
    expect(screen.queryByText('Amigos')).not.toBeOnTheScreen();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ url: `/v1/users/${profile.id}/friends` }),
    );
  });
  it('perfil privado: mostra o cartão com cadeado', async () => {
    mockApi('private');
    renderWithQuery(<PlayerFriendsScreen />);
    expect(
      await screen.findByText('Lista de amigos privada'),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Bruno mantém o perfil privado/)).toBeOnTheScreen();
  });
  it('sem amigos: vazio com o nome', async () => {
    mockApi('empty');
    renderWithQuery(<PlayerFriendsScreen />);
    expect(
      await screen.findByText('Ainda sem amigos por aqui'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Bruno ainda não adicionou ninguém.'),
    ).toBeOnTheScreen();
  });
});
