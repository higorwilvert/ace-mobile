import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/lib/api-client';
import { makeMyInvite, makePage, makeUser, otherPlayer } from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import { MyInvitesView } from './invites-view';

jest.mock('@/features/auth/session');
const mockSetParams = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    setParams: mockSetParams,
  }),
  useFocusEffect: () => {},
}));

type Config = { url?: string; params?: Record<string, unknown> };
const render = (
  search: Parameters<typeof MyInvitesView>[0]['search'],
  invites = [makeMyInvite()],
) => {
  const spy = jest
    .spyOn(api, 'request')
    .mockResolvedValue({ status: 200, data: makePage(invites) });
  renderWithQuery(<MyInvitesView search={search} header={null} />);
  return spy;
};

beforeEach(() => {
  seedToken();
  // Bruno é o usuário logado: convidado no fixture.
  mockSession({
    status: 'signed-in',
    user: makeUser({ id: otherPlayer.id, fullName: otherPlayer.fullName }),
  });
});
afterEach(() => jest.restoreAllMocks());

describe('MyInvitesView', () => {
  it('lista os recebidos com as ações do convidado e pede a caixa certa', async () => {
    const spy = render({ view: 'invites', role: 'all', box: 'received' });
    expect(
      await screen.findByLabelText('Aceitar convite de Ana'),
    ).toBeOnTheScreen();
    const call = spy.mock.calls.map(([c]) => c as Config)[0];
    expect(call.url).toBe('/v1/users/me/invites');
    expect(call.params).toMatchObject({ direction: 'received', limit: 20 });
  });

  it('não repete os filtros em linhas de chips', async () => {
    render({ view: 'invites', role: 'all', box: 'received' });
    await screen.findByLabelText('Aceitar convite de Ana');
    expect(screen.queryByLabelText('Caixa')).toBeNull();
    expect(screen.queryByLabelText('Situação do convite')).toBeNull();
  });

  it('vazios distintos por caixa', async () => {
    render({ view: 'invites', role: 'all', box: 'received' }, []);
    expect(
      await screen.findByText('Nenhum convite recebido'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
    expect(screen.getByText('Minhas partidas')).toBeOnTheScreen();
    jest.restoreAllMocks();
    render({ view: 'invites', role: 'all', box: 'sent' }, []);
    expect(
      await screen.findByText('Você ainda não convidou ninguém'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Minhas partidas'));
    expect(mockSetParams).toHaveBeenCalledWith({
      view: 'matches',
      role: 'all',
      box: 'received',
      status: '',
    });
  });

  it.each([
    [{ view: 'invites', role: 'all', box: 'received', status: 'PENDING' }],
    [{ view: 'invites', role: 'all', box: 'sent' }],
  ] as const)('oferece limpar filtros no vazio de %p', async (search) => {
    render(search, []);
    const clear = await screen.findByRole('button', { name: 'Limpar filtros' });
    expect(screen.getByText('Minhas partidas')).toBeOnTheScreen();
    fireEvent.press(clear);
    expect(mockSetParams).toHaveBeenCalledWith({
      view: 'invites',
      role: 'all',
      box: 'received',
      status: '',
    });
  });
});
