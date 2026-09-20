import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/lib/api-client';
import { makeMyInvite, makePage, makeUser, otherPlayer } from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import { MyInvitesView } from './invites-view';

jest.mock('@/features/auth/session');
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: () => {},
}));

type Config = { url?: string; params?: Record<string, unknown> };
const go = jest.fn();
const render = (
  search: Parameters<typeof MyInvitesView>[0]['search'],
  invites = [makeMyInvite()],
) => {
  const spy = jest
    .spyOn(api, 'request')
    .mockResolvedValue({ status: 200, data: makePage(invites) });
  renderWithQuery(<MyInvitesView search={search} go={go} header={null} />);
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

  it('chips gravam caixa e situação nos params', async () => {
    render({ view: 'invites', role: 'all', box: 'received' });
    fireEvent.press(await screen.findByText('Enviados'));
    expect(go).toHaveBeenCalledWith({ box: 'sent', status: undefined });
    fireEvent.press(screen.getByRole('button', { name: 'Recusado' }));
    expect(go).toHaveBeenCalledWith({ status: 'DECLINED' });
  });

  it('vazios distintos por caixa', async () => {
    render({ view: 'invites', role: 'all', box: 'received' }, []);
    expect(
      await screen.findByText('Nenhum convite recebido'),
    ).toBeOnTheScreen();
    jest.restoreAllMocks();
    render({ view: 'invites', role: 'all', box: 'sent' }, []);
    expect(
      await screen.findByText('Você ainda não convidou ninguém'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Minhas partidas'));
    expect(go).toHaveBeenCalledWith({ view: 'matches', status: undefined });
  });
});
