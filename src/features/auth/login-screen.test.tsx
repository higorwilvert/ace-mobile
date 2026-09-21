import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/lib/api-client';
import { makeSession } from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession } from '@/test/session-mock';

import { login } from './api';
import { LoginScreen } from './login-screen';

jest.mock('@/features/auth/session');
jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  login: jest.fn(),
}));

const fill = (email: string, password: string) => {
  fireEvent.changeText(screen.getByLabelText('E-mail'), email);
  fireEvent.changeText(screen.getByLabelText('Senha'), password);
};
const submit = () =>
  fireEvent.press(
    screen.getByRole('button', { name: 'Entrar na minha conta' }),
  );

describe('LoginScreen', () => {
  it('validates before calling the API', async () => {
    mockSession();
    renderWithQuery(<LoginScreen />);
    submit();
    expect(await screen.findByText('Email inválido')).toBeTruthy();
    expect(screen.getByText('Informe a senha atual')).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
  });
  it('logs in with normalized values and hands the session to the provider', async () => {
    const session = mockSession();
    const apiSession = makeSession();
    jest.mocked(login).mockResolvedValue(apiSession);
    renderWithQuery(<LoginScreen />);
    fill('  Ana@Exemplo.com ', 'Segredo-longo1');
    submit();
    await waitFor(() =>
      expect(session.signIn).toHaveBeenCalledWith(apiSession),
    );
    expect(login).toHaveBeenCalledWith({
      email: 'ana@exemplo.com',
      password: 'Segredo-longo1',
    });
  });
  it('shows the reviewed API message on failure', async () => {
    mockSession();
    jest
      .mocked(login)
      .mockRejectedValue(new ApiError('INVALID_CREDENTIALS', 401));
    renderWithQuery(<LoginScreen />);
    fill('ana@exemplo.com', 'errada');
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /E-mail ou senha incorretos/,
    );
  });
  it('explains an expired session and a boot network failure', () => {
    mockSession({ expired: true, bootError: new ApiError('NETWORK_ERROR') });
    renderWithQuery(<LoginScreen />);
    expect(
      screen.getByText('Sua sessão terminou. Entre novamente para continuar.'),
    ).toBeTruthy();
    expect(screen.getByText(/Confira sua conexão/)).toBeTruthy();
  });
});
