import { api } from '@/lib/api-client';
import { sessionToken } from '@/lib/token';
import { makeSession, makeUser } from '@/test/fixtures';

import {
  accountSchema,
  login,
  loginSchema,
  logout,
  personalStepSchema,
  register,
} from './api';

const ok = (data: unknown, status = 200) => ({ status, data: { data } });

describe('auth api', () => {
  it('login posts normalized credentials publicly and returns the session', async () => {
    const session = makeSession();
    const spy = jest.spyOn(api, 'request').mockResolvedValue(ok(session));
    await expect(
      login({ email: '  Ana@Exemplo.com ', password: 'Segredo-longo1' }),
    ).resolves.toEqual(session);
    expect(spy.mock.calls[0][0]).toMatchObject({
      method: 'POST',
      url: '/v1/auth/login',
      data: { email: 'ana@exemplo.com', password: 'Segredo-longo1' },
    });
    expect(spy.mock.calls[0][0].headers).not.toHaveProperty('Authorization');
  });
  it('register sends the exact API contract (no confirmation, gender only when set)', async () => {
    const user = makeUser();
    const spy = jest.spyOn(api, 'request').mockResolvedValue(ok(user, 201));
    const values = {
      ...accountSchema.parse({
        email: 'ANA@exemplo.com',
        password: 'Segredo-longo1',
        confirmPassword: 'Segredo-longo1',
      }),
      ...personalStepSchema.parse({
        fullName: ' Ana Clara Souza ',
        gender: '',
        state: 'SC',
        city: 'Florianópolis',
      }),
    };
    await expect(register(values)).resolves.toEqual(user);
    expect(spy.mock.calls[0][0].data).toEqual({
      fullName: 'Ana Clara Souza',
      email: 'ana@exemplo.com',
      password: 'Segredo-longo1',
      city: 'Florianópolis',
      state: 'SC',
    });
    await register({ ...values, gender: 'FEMALE' });
    expect(spy.mock.calls[1][0].data).toMatchObject({ gender: 'FEMALE' });
  });
  it('accountSchema rejects mismatched passwords with the form message', () => {
    const result = accountSchema.safeParse({
      email: 'ana@exemplo.com',
      password: 'Segredo-longo1',
      confirmPassword: 'Outra-senha1',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ['confirmPassword'],
      message: 'As senhas precisam ser iguais',
    });
  });
  it('loginSchema requires the current password', () => {
    expect(
      loginSchema.safeParse({ email: 'ana@exemplo.com', password: '' }).success,
    ).toBe(false);
  });
  it('logout posts to the revoke endpoint', async () => {
    await sessionToken.set('a'.repeat(43), makeSession().expiresAt);
    const spy = jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 204, data: '' });
    await expect(logout()).resolves.toBeUndefined();
    expect(spy.mock.calls[0][0]).toMatchObject({
      method: 'POST',
      url: '/v1/auth/logout',
    });
    await sessionToken.clear();
  });
});
