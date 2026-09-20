import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AxiosError, AxiosHeaders } from 'axios';

import { api } from '@/lib/api-client';
import { sessionEnded } from '@/lib/events';
import { queryClient } from '@/lib/react-query';
import { sessionToken } from '@/lib/token';
import { makeSession, makeUser } from '@/test/fixtures';

import { SessionProvider, useSession } from './session';

const { __store: store } = jest.requireMock('expo-secure-store') as {
  __store: Map<string, string>;
};
const secret = 'a'.repeat(43);
const seedStoredSession = () =>
  store.set(
    'ace.session',
    JSON.stringify({ token: secret, expiresAt: Date.now() + 60 * 60_000 }),
  );
const failure = (status: number) =>
  new AxiosError('raw', undefined, undefined, undefined, {
    status,
    data: {},
    statusText: 'error',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
const renderSession = () =>
  renderHook(() => useSession(), { wrapper: SessionProvider });

beforeEach(async () => {
  await sessionToken.clear();
  store.clear();
  queryClient.clear();
});
afterAll(() => sessionToken.clear());

describe('SessionProvider', () => {
  it('starts loading and ends signed-out without a stored credential', async () => {
    const { result } = renderSession();
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('signed-out'));
    expect(result.current.expired).toBe(false);
    expect(result.current.bootError).toBeNull();
  });
  it('restores a stored credential by validating it with /users/me', async () => {
    seedStoredSession();
    const user = makeUser();
    const spy = jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 200, data: { data: user } });
    const { result } = renderSession();
    await waitFor(() => expect(result.current.status).toBe('signed-in'));
    expect(result.current.user).toEqual(user);
    expect(spy.mock.calls[0][0]).toMatchObject({
      url: '/v1/users/me',
      headers: expect.objectContaining({ Authorization: `Bearer ${secret}` }),
    });
  });
  it('treats a 401 on boot as an expired session and clears storage', async () => {
    seedStoredSession();
    jest.spyOn(api, 'request').mockRejectedValue(failure(401));
    const { result } = renderSession();
    await waitFor(() => expect(result.current.status).toBe('signed-out'));
    expect(result.current.expired).toBe(true);
    expect(sessionToken.get()).toBeNull();
    await waitFor(() => expect(store.has('ace.session')).toBe(false));
  });
  it('keeps the credential on network failure and reports it', async () => {
    seedStoredSession();
    jest
      .spyOn(api, 'request')
      .mockRejectedValue(new AxiosError('raw', 'ERR_NETWORK'));
    const { result } = renderSession();
    await waitFor(() => expect(result.current.status).toBe('signed-out'));
    expect(result.current.expired).toBe(false);
    expect(result.current.bootError?.code).toBe('NETWORK_ERROR');
    expect(store.has('ace.session')).toBe(true);
  });
  it('signs in, then signs out only after the API revokes the session', async () => {
    const { result } = renderSession();
    await waitFor(() => expect(result.current.status).toBe('signed-out'));
    const session = makeSession();
    await act(() => result.current.signIn(session));
    expect(result.current.status).toBe('signed-in');
    expect(result.current.user).toEqual(session.user);
    expect(sessionToken.get()).toBe(session.accessToken);
    expect(queryClient.getQueryData(['private', 'me'])).toEqual(session.user);

    const spy = jest.spyOn(api, 'request').mockRejectedValueOnce(failure(500));
    await act(async () => {
      await expect(result.current.signOut()).rejects.toMatchObject({
        code: 'REQUEST_FAILED',
      });
    });
    expect(result.current.status).toBe('signed-in');

    spy.mockResolvedValueOnce({ status: 204, data: '' });
    await act(() => result.current.signOut());
    expect(result.current.status).toBe('signed-out');
    expect(result.current.expired).toBe(false);
    expect(sessionToken.get()).toBeNull();
    expect(queryClient.getQueryData(['private', 'me'])).toBeUndefined();
  });
  it('signs out locally when logout answers 401 (already revoked)', async () => {
    const { result } = renderSession();
    await waitFor(() => expect(result.current.status).toBe('signed-out'));
    await act(() => result.current.signIn(makeSession()));
    jest.spyOn(api, 'request').mockRejectedValueOnce(failure(401));
    await act(() => result.current.signOut());
    await waitFor(() => expect(result.current.status).toBe('signed-out'));
  });
  it('follows the user written into the query cache', async () => {
    seedStoredSession();
    jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 200, data: { data: makeUser() } });
    const { result } = renderSession();
    await waitFor(() => expect(result.current.status).toBe('signed-in'));
    const edited = makeUser({ fullName: 'Ana Souza Lima' });
    act(() => {
      queryClient.setQueryData(['private', 'me'], edited);
    });
    await waitFor(() => expect(result.current.user).toEqual(edited));
  });
  it('reacts to the sessionEnded signal from the HTTP layer', async () => {
    const { result } = renderSession();
    await waitFor(() => expect(result.current.status).toBe('signed-out'));
    await act(() => result.current.signIn(makeSession()));
    act(() => sessionEnded.emit());
    expect(result.current.status).toBe('signed-out');
    expect(result.current.expired).toBe(true);
    expect(queryClient.getQueryData(['private', 'me'])).toBeUndefined();
  });
});
