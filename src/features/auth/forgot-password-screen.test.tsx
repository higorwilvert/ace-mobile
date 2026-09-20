import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/lib/api-client';
import { renderWithQuery } from '@/test/render';

import { ForgotPasswordScreen } from './forgot-password-screen';

describe('ForgotPasswordScreen', () => {
  afterEach(() => jest.restoreAllMocks());

  it('não deixa enviar e-mail inválido', async () => {
    const spy = jest.spyOn(api, 'request');
    renderWithQuery(<ForgotPasswordScreen />);
    fireEvent.changeText(screen.getByLabelText('E-mail'), 'nao-e-email');
    fireEvent.press(screen.getByText('Enviar instruções'));
    expect(await screen.findByText('Email inválido')).toBeOnTheScreen();
    expect(spy).not.toHaveBeenCalled();
  });

  it.each([
    ['existente', 'ana@exemplo.com'],
    ['inexistente', 'ninguem@exemplo.com'],
  ])('mostra a mesma confirmação neutra para e-mail %s', async (_, email) => {
    const spy = jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 202, data: { message: 'ok' } });
    renderWithQuery(<ForgotPasswordScreen />);
    fireEvent.changeText(screen.getByLabelText('E-mail'), email);
    fireEvent.press(screen.getByText('Enviar instruções'));
    await waitFor(() =>
      expect(screen.getByText(/se houver uma conta ativa/i)).toBeOnTheScreen(),
    );
    expect(screen.getByText(/abre no navegador/i)).toBeOnTheScreen();
    expect(spy.mock.calls[0][0]).toMatchObject({
      method: 'POST',
      url: '/v1/auth/forgot-password',
      data: { email },
    });
  });

  it('volta ao formulário em "tentar outro e-mail"', async () => {
    jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 202, data: { message: 'ok' } });
    renderWithQuery(<ForgotPasswordScreen />);
    fireEvent.changeText(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    fireEvent.press(screen.getByText('Enviar instruções'));
    fireEvent.press(await screen.findByText('Tentar outro e-mail'));
    expect(await screen.findByLabelText('E-mail')).toBeOnTheScreen();
  });

  it('mostra o erro de rede sem sair do formulário', async () => {
    jest.spyOn(api, 'request').mockRejectedValue(new Error('offline'));
    renderWithQuery(<ForgotPasswordScreen />);
    fireEvent.changeText(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    fireEvent.press(screen.getByText('Enviar instruções'));
    expect(await screen.findByRole('alert')).toBeOnTheScreen();
    expect(screen.getByLabelText('E-mail')).toBeOnTheScreen();
  });
});
