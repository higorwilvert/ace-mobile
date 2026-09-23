import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { toast } from 'sonner-native';

import { api, ApiError } from '@/lib/api-client';
import { sessionToken } from '@/lib/token';
import { makeUser } from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import { AccountScreen } from './account-screen';

jest.mock('@/features/auth/session');
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

beforeEach(async () => {
  mockPush.mockClear();
  mockSession({ status: 'signed-in', user: makeUser() });
  await seedToken();
});
afterEach(() => jest.restoreAllMocks());

describe('AccountScreen', () => {
  it('leva aos ajustes de perfil que saíram da aba Perfil', async () => {
    renderWithQuery(<AccountScreen />);
    for (const [label, href] of [
      ['Dados pessoais', '/personal'],
      ['Meus esportes', '/sports'],
      ['Disponibilidade', '/availability'],
    ] as const) {
      fireEvent.press(await screen.findByText(label));
      expect(mockPush).toHaveBeenCalledWith(href);
    }
  });

  it('mostra o e-mail e sai pela sessão', async () => {
    const session = mockSession({ status: 'signed-in', user: makeUser() });
    renderWithQuery(<AccountScreen />);
    expect(screen.getByText('ana@exemplo.com')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(session.signOut).toHaveBeenCalledTimes(1));
  });

  it('mantém a sessão e avisa quando a API recusa o logout', async () => {
    const session = mockSession({ status: 'signed-in', user: makeUser() });
    jest
      .mocked(session.signOut)
      .mockRejectedValue(new ApiError('REQUEST_FAILED', 500));
    renderWithQuery(<AccountScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Sair' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Não foi possível concluir a solicitação. Tente novamente.',
      ),
    );
  });

  it('alterna a visibilidade do perfil', async () => {
    const spy = jest.spyOn(api, 'request').mockResolvedValue({
      status: 200,
      data: { data: makeUser({ profileVisibility: 'PRIVATE' }) },
    });
    renderWithQuery(<AccountScreen />);
    const toggle = screen.getByLabelText('Perfil privado');
    expect(toggle.props.value).toBe(false);
    fireEvent(toggle, 'valueChange', true);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][0]).toMatchObject({
      method: 'PATCH',
      url: '/v1/users/me',
      data: { profileVisibility: 'PRIVATE' },
    });
    await waitFor(() =>
      expect(screen.getByLabelText('Perfil privado').props.value).toBe(true),
    );
  });

  it('volta o switch quando a API falha', async () => {
    jest.spyOn(api, 'request').mockRejectedValue(new Error('rede'));
    renderWithQuery(<AccountScreen />);
    fireEvent(screen.getByLabelText('Perfil privado'), 'valueChange', true);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByLabelText('Perfil privado').props.value).toBe(false);
  });

  it('só habilita a desativação com a palavra exata', async () => {
    renderWithQuery(<AccountScreen />);
    fireEvent.press(screen.getByText('Desativar minha conta'));
    const confirm = await screen.findByRole('button', {
      name: 'Confirmar desativação',
    });
    expect(confirm).toBeDisabled();
    fireEvent.changeText(
      screen.getByLabelText('Digite DESATIVAR'),
      'desativar',
    );
    expect(
      screen.getByRole('button', { name: 'Confirmar desativação' }),
    ).toBeDisabled();
    fireEvent.changeText(
      screen.getByLabelText('Digite DESATIVAR'),
      'DESATIVAR',
    );
    expect(
      screen.getByRole('button', { name: 'Confirmar desativação' }),
    ).not.toBeDisabled();
  });

  it('desativa, limpa a sessão local e volta ao login', async () => {
    const spy = jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 204, data: '' });
    renderWithQuery(<AccountScreen />);
    fireEvent.press(screen.getByText('Desativar minha conta'));
    fireEvent.changeText(
      await screen.findByLabelText('Digite DESATIVAR'),
      'DESATIVAR',
    );
    fireEvent.press(
      screen.getByRole('button', { name: 'Confirmar desativação' }),
    );
    await waitFor(() =>
      expect(spy.mock.calls[0][0]).toMatchObject({
        method: 'DELETE',
        url: '/v1/users/me',
      }),
    );
    await waitFor(() => expect(sessionToken.get()).toBeNull());
    // Só DELETE: a conta já não existe, não faz sentido chamar /auth/logout.
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
