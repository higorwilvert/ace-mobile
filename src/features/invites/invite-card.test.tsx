import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { api } from '@/lib/api-client';
import { makeMyInvite, makeUser, otherPlayer } from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { seedToken } from '@/test/session-mock';

import { InviteCard } from './invite-card';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

const ana = makeUser().id;
const bruno = otherPlayer.id;
const invite = makeMyInvite();
const mockApi = () =>
  jest.spyOn(api, 'request').mockImplementation((config: { url?: string }) =>
    Promise.resolve({
      status: 200,
      data: {
        data: {
          ...invite,
          status: String(config.url).endsWith('/accept')
            ? 'ACCEPTED'
            : String(config.url).endsWith('/decline')
              ? 'DECLINED'
              : 'CANCELLED',
        },
      },
    }),
  );
const confirmDestructive = () =>
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
    buttons?.find((b) => b.style === 'destructive')?.onPress?.();
  });

beforeEach(() => seedToken());
afterEach(() => jest.restoreAllMocks());

describe('InviteCard', () => {
  it('convidado vê quem convidou, a mensagem, a partida e aceita', async () => {
    const spy = mockApi();
    renderWithQuery(<InviteCard invite={invite} viewerId={bruno} />);
    expect(screen.getByText('Ana Clara Souza')).toBeOnTheScreen();
    expect(screen.getByText('convidou você para o Time 2')).toBeOnTheScreen();
    expect(screen.getByText('Bora?')).toBeOnTheScreen();
    expect(screen.getByText('Padel de sábado')).toBeOnTheScreen();
    expect(screen.getByText('1 de 4')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Aceitar convite de Ana'));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `/v1/matches/${invite.matchId}/invites/${invite.id}/accept`,
        }),
      ),
    );
  });

  it('recusar pede confirmação e chama a API', async () => {
    const spy = mockApi();
    confirmDestructive();
    renderWithQuery(<InviteCard invite={invite} viewerId={bruno} />);
    fireEvent.press(screen.getByLabelText('Recusar convite de Ana'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Recusar este convite?',
      expect.any(String),
      expect.any(Array),
    );
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.stringMatching(/\/decline$/) }),
      ),
    );
  });

  it('convidante só cancela, com confirmação', async () => {
    const spy = mockApi();
    confirmDestructive();
    renderWithQuery(<InviteCard invite={invite} viewerId={ana} />);
    expect(screen.getByText('Bruno Lima')).toBeOnTheScreen();
    expect(screen.getByText('convidado para o Time 2')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Aceitar/)).not.toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Cancelar convite para Bruno'));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.stringMatching(/\/cancel$/) }),
      ),
    );
  });

  it('partida lotada: explica o bloqueio e não oferece Aceitar', () => {
    renderWithQuery(
      <InviteCard
        invite={makeMyInvite({
          match: {
            ...invite.match,
            status: 'CONFIRMED',
            capacity: { teamSize: 2, total: 4, confirmed: 4, available: 0 },
          },
        })}
        viewerId={bruno}
      />,
    );
    expect(screen.getByText('Os times já estão completos.')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Aceitar/)).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Recusar convite de Ana')).toBeOnTheScreen();
  });

  it('convite respondido mostra o selo e nenhuma ação', () => {
    renderWithQuery(
      <InviteCard
        invite={makeMyInvite({ status: 'ACCEPTED' })}
        viewerId={bruno}
      />,
    );
    expect(screen.getByText('Aceito')).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: /convite/ }),
    ).not.toBeOnTheScreen();
  });

  it('abre o perfil da outra pessoa e o detalhe da partida', () => {
    renderWithQuery(<InviteCard invite={invite} viewerId={bruno} />);
    fireEvent.press(screen.getByLabelText('Ver perfil de Ana Clara Souza'));
    expect(mockPush).toHaveBeenCalledWith(`/players/${ana}`);
    fireEvent.press(screen.getByLabelText('Abrir Padel de sábado'));
    expect(mockPush).toHaveBeenCalledWith(`/matches/${invite.match.id}`);
  });
});
