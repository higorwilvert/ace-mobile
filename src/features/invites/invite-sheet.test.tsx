import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { toast } from 'sonner-native';

import { api, ApiError } from '@/lib/api-client';
import {
  makeFriend,
  makeInvite,
  makeMatchDetail,
  makePage,
  makeSearchItem,
  makeUser,
  otherPlayer,
} from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { seedToken } from '@/test/session-mock';

import { InviteSheet } from './invite-sheet';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

type Config = {
  method?: string;
  url?: string;
  data?: unknown;
  params?: unknown;
};
const match = makeMatchDetail();
const carla = {
  id: '99999999-9999-4999-8999-999999999999',
  fullName: 'Carla Dias',
  avatarUrl: null,
  city: 'Blumenau',
  state: 'SC',
};
const ana = { ...makeUser(), avatarUrl: null };
const mockApi = (sendStatus = 201, friends: unknown[] = []) =>
  jest.spyOn(api, 'request').mockImplementation((config: Config) => {
    if (config.method === 'POST') {
      if (sendStatus !== 201)
        return Promise.reject(new ApiError('INVITE_ALREADY_PENDING', 409));
      return Promise.resolve({ status: 201, data: { data: makeInvite() } });
    }
    if (config.url === '/v1/users/me/friends')
      return Promise.resolve({ status: 200, data: makePage(friends) });
    return Promise.resolve({
      status: 200,
      data: {
        data: [
          makeSearchItem({
            id: ana.id,
            fullName: ana.fullName,
            city: ana.city,
            state: ana.state,
          }),
          makeSearchItem(otherPlayer),
          makeSearchItem(carla),
        ],
      },
    });
  });

beforeEach(() => seedToken());
afterEach(() => jest.restoreAllMocks());

describe('InviteSheet', () => {
  it('busca pelo nome na modalidade, marca quem já está e envia com time e mensagem', async () => {
    const spy = mockApi();
    const onClose = jest.fn();
    renderWithQuery(<InviteSheet match={match} visible onClose={onClose} />);
    expect(
      screen.getByText('Digite ao menos duas letras para buscar.'),
    ).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('Nome do jogador'), 'Ca');
    expect(await screen.findByText('Carla Dias')).toBeOnTheScreen();
    const search = spy.mock.calls
      .map(([c]) => c as Config)
      .find((c) => c.url === '/v1/users');
    expect(search?.params).toEqual({
      q: 'Ca',
      sportId: match.sportId,
      limit: 30,
    });
    // Criadora e quem já está no time não recebem botão.
    expect(screen.getByText('Você')).toBeOnTheScreen();
    expect(
      screen.queryByLabelText('Convidar Ana Clara Souza'),
    ).not.toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Convidar Carla Dias'));
    expect(
      await screen.findByText('Time sugerido (opcional)'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Time 2'));
    fireEvent.changeText(screen.getByLabelText('Mensagem (opcional)'), 'Bora?');
    fireEvent.press(screen.getByText('Enviar convite'));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `/v1/matches/${match.id}/invites`,
          data: { inviteeUserId: carla.id, teamIndex: 2, message: 'Bora?' },
        }),
      ),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalled();
  });

  it('mostra a rejeição da API dentro da folha', async () => {
    mockApi(409);
    renderWithQuery(<InviteSheet match={match} visible onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText('Nome do jogador'), 'Ca');
    fireEvent.press(await screen.findByLabelText('Convidar Carla Dias'));
    fireEvent.press(await screen.findByText('Enviar convite'));
    expect(
      await screen.findByText('Este jogador já tem um convite pendente.'),
    ).toBeOnTheScreen();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('mostra os amigos antes de digitar e convida com um toque (T33)', async () => {
    const spy = mockApi(201, [makeFriend({ user: carla })]);
    renderWithQuery(<InviteSheet match={match} visible onClose={jest.fn()} />);
    expect(await screen.findByText('Seus amigos')).toBeOnTheScreen();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/v1/users/me/friends' }),
    );
    fireEvent.press(screen.getByLabelText('Convidar Carla Dias'));
    expect(
      await screen.findByText('Time sugerido (opcional)'),
    ).toBeOnTheScreen();
  });

  it('amigo que já está na partida aparece marcado, e digitar passa à busca (T33)', async () => {
    mockApi(201, [makeFriend({ user: otherPlayer })]);
    const base = makeMatchDetail();
    const withBruno = makeMatchDetail({
      teams: [
        base.teams[0],
        {
          ...base.teams[1],
          participants: [
            {
              id: '88888888-8888-4888-8888-888888888888',
              user: otherPlayer,
              isCreator: false,
              joinedAt: '2026-09-12T12:00:00.000Z',
            },
          ],
        },
      ],
    });
    renderWithQuery(
      <InviteSheet match={withBruno} visible onClose={jest.fn()} />,
    );
    expect(await screen.findByText('Seus amigos')).toBeOnTheScreen();
    expect(screen.getByText('Já está na partida')).toBeOnTheScreen();
    expect(
      screen.queryByLabelText('Convidar Bruno Lima'),
    ).not.toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('Nome do jogador'), 'Ca');
    expect(await screen.findByText('Carla Dias')).toBeOnTheScreen();
    expect(screen.queryByText('Seus amigos')).not.toBeOnTheScreen();
  });

  it('sem amigos, explica onde eles aparecem (T33)', async () => {
    mockApi();
    renderWithQuery(<InviteSheet match={match} visible onClose={jest.fn()} />);
    expect(
      await screen.findByText(
        'Seus amigos aparecem aqui quando você adicionar alguém.',
      ),
    ).toBeOnTheScreen();
  });

  it('Voltar retorna à busca', async () => {
    mockApi();
    renderWithQuery(<InviteSheet match={match} visible onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText('Nome do jogador'), 'Ca');
    fireEvent.press(await screen.findByLabelText('Convidar Carla Dias'));
    fireEvent.press(await screen.findByText('Voltar'));
    expect(await screen.findByLabelText('Nome do jogador')).toBeOnTheScreen();
  });
});
