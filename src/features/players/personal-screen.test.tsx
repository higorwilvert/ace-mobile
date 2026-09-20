import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { toast } from 'sonner-native';

import { api } from '@/lib/api-client';
import { makeUser } from '@/test/fixtures';
import { renderWithQuery } from '@/test/render';
import { mockSession, seedToken } from '@/test/session-mock';

import { PersonalScreen } from './personal-screen';

jest.mock('@/features/auth/session');

const user = makeUser({ phone: '48999990000', bio: 'Oi' });

beforeEach(async () => {
  mockSession({ status: 'signed-in', user });
  await seedToken();
});
afterEach(() => jest.restoreAllMocks());

describe('PersonalScreen', () => {
  it('carrega os dados atuais e mostra o e-mail somente leitura', () => {
    renderWithQuery(<PersonalScreen />);
    expect(screen.getByLabelText('Nome completo')).toHaveDisplayValue(
      'Ana Clara Souza',
    );
    expect(screen.getByLabelText('Telefone')).toHaveDisplayValue('48999990000');
    expect(screen.getByText('ana@exemplo.com')).toBeOnTheScreen();
    expect(screen.queryByLabelText('E-mail')).not.toBeOnTheScreen();
    expect(screen.getByText('AS')).toBeOnTheScreen();
  });

  it('salva convertendo campos vazios em null e atualiza o cache', async () => {
    const saved = makeUser({ phone: null, fullName: 'Ana Souza' });
    const spy = jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 200, data: { data: saved } });
    renderWithQuery(<PersonalScreen />);
    fireEvent.changeText(screen.getByLabelText('Telefone'), '');
    fireEvent.press(screen.getByText('Salvar alterações'));
    const patch = () =>
      spy.mock.calls.find((call) => call[0].method === 'PATCH')?.[0];
    await waitFor(() => expect(patch()).toBeTruthy());
    expect(patch()).toMatchObject({
      method: 'PATCH',
      url: '/v1/users/me',
      data: {
        fullName: 'Ana Clara Souza',
        gender: 'FEMALE',
        state: 'SC',
        city: 'Florianópolis',
        phone: null,
        avatarUrl: null,
        bio: 'Oi',
        dominantHand: null,
      },
    });
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Dados atualizados.'),
    );
  });

  it('não envia com nome vazio', async () => {
    const spy = jest.spyOn(api, 'request');
    renderWithQuery(<PersonalScreen />);
    fireEvent.changeText(screen.getByLabelText('Nome completo'), '');
    fireEvent.press(screen.getByText('Salvar alterações'));
    expect(await screen.findByText('Informe seu nome')).toBeOnTheScreen();
    expect(
      spy.mock.calls.filter((call) => call[0].method === 'PATCH'),
    ).toHaveLength(0);
  });

  it('mostra o erro da API sem sair da tela', async () => {
    jest.spyOn(api, 'request').mockRejectedValue(
      Object.assign(new Error('x'), {
        isAxiosError: true,
        response: {
          status: 400,
          data: { error: { code: 'CITY_NOT_IN_STATE' } },
        },
      }),
    );
    renderWithQuery(<PersonalScreen />);
    fireEvent.press(screen.getByText('Salvar alterações'));
    expect(
      await screen.findByText(/não pertence ao estado/i),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Nome completo')).toBeOnTheScreen();
  });
});
