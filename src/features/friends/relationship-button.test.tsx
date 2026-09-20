import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { toast } from 'sonner-native';

import { api, ApiError } from '@/lib/api-client';
import {
  makeFriendRequest,
  makeRelationship,
  otherPlayer,
} from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { seedToken } from '@/test/session-mock';

import { RelationshipButton } from './relationship-button';

type Config = { method?: string; url?: string };
const requestId = makeFriendRequest().id;
const render = (relationship = makeRelationship()) =>
  renderWithQuery(
    <RelationshipButton
      userId={otherPlayer.id}
      name={otherPlayer.fullName}
      relationship={relationship}
    />,
  );
const mockApi = (error?: ApiError) =>
  jest.spyOn(api, 'request').mockImplementation((config: Config) => {
    if (error) return Promise.reject(error);
    return Promise.resolve(
      config.method === 'DELETE'
        ? { status: 204, data: '' }
        : { status: 200, data: { data: makeFriendRequest() } },
    );
  });

beforeEach(() => seedToken());
afterEach(() => jest.restoreAllMocks());

describe('RelationshipButton', () => {
  it('não renderiza nada para o próprio jogador', () => {
    render(makeRelationship({ status: 'SELF' }));
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });
  it('NONE → "Adicionar" envia o pedido e avisa', async () => {
    const spy = mockApi();
    render();
    fireEvent.press(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `/v1/users/${otherPlayer.id}/friend-requests`,
        }),
      ),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Pedido enviado para Bruno.'),
    );
  });
  it('REQUEST_SENT → pill + "Cancelar" cancela o pedido', async () => {
    const spy = mockApi();
    render(makeRelationship({ status: 'REQUEST_SENT', requestId }));
    expect(screen.getByText('Pedido enviado')).toBeOnTheScreen();
    fireEvent.press(
      screen.getByLabelText('Cancelar pedido de amizade para Bruno Lima'),
    );
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `/v1/friend-requests/${requestId}/cancel`,
        }),
      ),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Pedido cancelado.'),
    );
  });
  it('REQUEST_RECEIVED → "Aceitar" e "Recusar"', async () => {
    const spy = mockApi();
    render(makeRelationship({ status: 'REQUEST_RECEIVED', requestId }));
    fireEvent.press(
      screen.getByLabelText('Recusar pedido de amizade de Bruno Lima'),
    );
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `/v1/friend-requests/${requestId}/decline`,
        }),
      ),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Pedido recusado.'),
    );
    fireEvent.press(
      screen.getByLabelText('Aceitar pedido de amizade de Bruno Lima'),
    );
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `/v1/friend-requests/${requestId}/accept`,
        }),
      ),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Agora você e Bruno são amigos.',
      ),
    );
  });
  it('FRIENDS → "Amigos" pede confirmação antes de desfazer', async () => {
    const spy = mockApi();
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_t, _m, buttons) => buttons?.[1]?.onPress?.());
    render(
      makeRelationship({
        status: 'FRIENDS',
        since: '2026-09-19T15:00:00.000Z',
      }),
    );
    fireEvent.press(
      screen.getByLabelText('Amigos com Bruno Lima. Desfazer amizade'),
    );
    expect(alert).toHaveBeenCalledWith(
      'Desfazer amizade com Bruno?',
      expect.stringMatching(/deixam de ser amigos/),
      expect.any(Array),
    );
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: `/v1/users/me/friends/${otherPlayer.id}`,
        }),
      ),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Você e Bruno não são mais amigos.',
      ),
    );
  });
  it('"Manter amizade" não chama a API', () => {
    const spy = mockApi();
    jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_t, _m, buttons) => buttons?.[0]?.onPress?.());
    render(makeRelationship({ status: 'FRIENDS' }));
    fireEvent.press(
      screen.getByLabelText('Amigos com Bruno Lima. Desfazer amizade'),
    );
    expect(spy).not.toHaveBeenCalled();
  });
  it('recusa da API vira toast com a mensagem do contrato e refaz as consultas', async () => {
    mockApi(new ApiError('FRIEND_REQUEST_RECEIVED', 409));
    const { queryClient } = render();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    fireEvent.press(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Esta pessoa já pediu sua amizade. Aceite o pedido recebido.',
      ),
    );
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['private', 'friends'],
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['private', 'inbox'],
    });
  });
});
