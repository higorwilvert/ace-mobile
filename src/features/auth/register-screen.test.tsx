import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/lib/api-client';
import { makeSession, makeUser } from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession } from '@/test/session-mock';

import { login, register } from './api';
import { RegisterScreen } from './register-screen';

jest.mock('@/features/auth/session');
jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  register: jest.fn(),
  login: jest.fn(),
}));

const fillAccount = (confirm = 'Segredo-longo1') => {
  fireEvent.changeText(screen.getByLabelText('E-mail'), 'ANA@exemplo.com');
  fireEvent.changeText(screen.getByLabelText('Senha'), 'Segredo-longo1');
  fireEvent.changeText(screen.getByLabelText('Confirmar senha'), confirm);
};
const next = () => fireEvent.press(screen.getByText('Continuar'));
const submit = () =>
  fireEvent.press(screen.getByRole('button', { name: 'Criar minha conta' }));
const fillPersonal = async (city: string) => {
  fireEvent.changeText(
    await screen.findByLabelText('Nome completo'),
    ' Ana Clara Souza ',
  );
  fireEvent.press(screen.getByRole('button', { name: 'Estado' }));
  fireEvent.press(screen.getByText('SC'));
  fireEvent.press(
    await screen.findByRole('button', { name: 'Cidade', disabled: false }),
  );
  fireEvent.press(await screen.findByText(city));
};

beforeEach(() => {
  mockSession();
  // Cidades vêm da API pública de localidades.
  jest.spyOn(api, 'request').mockImplementation(async (config) => {
    if (config?.url === '/v1/locations/states/SC/cities')
      return { status: 200, data: { data: ['Florianópolis', 'Joinville'] } };
    throw new Error(`unexpected request ${config?.url}`);
  });
});

describe('RegisterScreen', () => {
  it('não avança da etapa 1 com campos inválidos', async () => {
    renderWithQuery(<RegisterScreen />);
    next();
    expect(await screen.findByText('Email inválido')).toBeOnTheScreen();
    fillAccount('Outra-senha1');
    next();
    expect(
      await screen.findByText('As senhas precisam ser iguais'),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText('Nome completo')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Etapa 1 de 5')).toBeOnTheScreen();
  });

  it('avança para a etapa 2 e volta preservando o que foi digitado', async () => {
    renderWithQuery(<RegisterScreen />);
    fillAccount();
    next();
    expect(await screen.findByLabelText('Nome completo')).toBeOnTheScreen();
    expect(screen.getByLabelText('Etapa 2 de 5')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Voltar'));
    expect(await screen.findByLabelText('E-mail')).toHaveDisplayValue(
      'ANA@exemplo.com',
    );
  });

  it('valida a etapa 2, cadastra com o payload exato e entra', async () => {
    const session = mockSession();
    jest.mocked(register).mockResolvedValue(makeUser());
    const apiSession = makeSession();
    jest.mocked(login).mockResolvedValue(apiSession);
    renderWithQuery(<RegisterScreen />);
    fillAccount();
    next();
    await screen.findByLabelText('Nome completo');
    submit();
    expect(await screen.findByText('Informe seu nome')).toBeOnTheScreen();
    expect(screen.getByText('Selecione seu estado')).toBeOnTheScreen();
    expect(register).not.toHaveBeenCalled();

    await fillPersonal('Florianópolis');
    submit();
    await waitFor(() =>
      expect(session.signIn).toHaveBeenCalledWith(apiSession),
    );
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Ana Clara Souza',
        email: 'ana@exemplo.com',
        password: 'Segredo-longo1',
        state: 'SC',
        city: 'Florianópolis',
        gender: '',
      }),
    );
    expect(login).toHaveBeenCalledWith({
      email: 'ana@exemplo.com',
      password: 'Segredo-longo1',
    });
  });

  it('cadastra uma única vez quando o login falha e refaz só o login', async () => {
    jest.mocked(register).mockResolvedValue(makeUser());
    jest.mocked(login).mockRejectedValueOnce(new Error('offline'));
    renderWithQuery(<RegisterScreen />);
    fillAccount();
    next();
    await fillPersonal('Joinville');
    submit();
    expect(await screen.findByRole('alert')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(login).toHaveBeenCalledTimes(2));
    expect(register).toHaveBeenCalledTimes(1);
  });
});
