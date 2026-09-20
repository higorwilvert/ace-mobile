import { AxiosError, AxiosHeaders, CanceledError } from 'axios';
import { z } from 'zod';

import { api, ApiError, apiRequest, validateApiPath } from './api-client';
import { sessionToken } from './token';

const secret = 'a'.repeat(43);
function failure(status: number, data: unknown = {}) {
  return new AxiosError(
    'untrusted server text',
    undefined,
    undefined,
    undefined,
    {
      status,
      data,
      statusText: 'error',
      headers: {},
      config: { headers: new AxiosHeaders() },
    },
  );
}
const inOneMinute = () => new Date(Date.now() + 60_000).toISOString();

beforeEach(() => sessionToken.set(secret, inOneMinute()));
afterEach(() => sessionToken.clear());

describe('ACE HTTP trust boundary', () => {
  it('targets the configured origin with JSON and the Bearer token', async () => {
    const spy = jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 200, data: { data: 'ok' } });
    await expect(
      apiRequest(
        'POST',
        '/v1/users/me/sport-profiles',
        z.object({ data: z.string() }),
        { sportId: 1 },
      ),
    ).resolves.toEqual({ data: 'ok' });
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/v1/users/me/sport-profiles',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
      }),
    );
    expect(api.defaults.baseURL).toBe('http://localhost:3001');
    expect(api.defaults.withCredentials).toBe(false);
    expect(api.defaults.allowAbsoluteUrls).toBe(false);
  });
  it('keeps public requests independent of the private session', async () => {
    const spy = jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 200, data: [] });
    await apiRequest('GET', '/v1/sports', z.array(z.string()), undefined, {
      public: true,
    });
    expect(spy.mock.calls[0][0].headers).not.toHaveProperty('Authorization');
  });
  it('sends the token on optional-auth requests only when a session exists', async () => {
    const spy = jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 200, data: { data: 'ok' } });
    await sessionToken.clear();
    await apiRequest('GET', '/v1/users/x/profile', z.object({}), undefined, {
      auth: 'optional',
    });
    expect(spy.mock.calls[0][0].headers).not.toHaveProperty('Authorization');
    await sessionToken.set(secret, inOneMinute());
    await apiRequest('GET', '/v1/users/x/profile', z.object({}), undefined, {
      auth: 'optional',
    });
    expect(spy.mock.calls[1][0].headers).toHaveProperty(
      'Authorization',
      `Bearer ${secret}`,
    );
  });
  it('drops empty query params', async () => {
    const spy = jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 200, data: [] });
    await apiRequest('GET', '/v1/matches', z.array(z.string()), undefined, {
      params: { city: 'Joinville', sport: '', page: undefined, limit: 20 },
    });
    expect(spy.mock.calls[0][0].params).toEqual({
      city: 'Joinville',
      limit: 20,
    });
  });
  it.each([
    'https://evil.test/x',
    '//evil.test',
    '/v1/../auth',
    '/v1//auth',
    '/v1/auth?url=evil',
    '/auth',
    '/v1/hello\\evil',
  ])('blocks unsafe API destination %s', (path) => {
    expect(() => validateApiPath(path)).toThrow('Invalid API path');
  });
  it('parses empty 204 responses without inventing a body', async () => {
    jest.spyOn(api, 'request').mockResolvedValue({ status: 204, data: '' });
    await expect(
      apiRequest('DELETE', '/v1/users/me', z.void()),
    ).resolves.toBeUndefined();
  });
  it('rejects incompatible response contracts', async () => {
    jest
      .spyOn(api, 'request')
      .mockResolvedValue({ status: 200, data: { wrong: true } });
    await expect(
      apiRequest('GET', '/v1/users/me', z.object({ data: z.string() })),
    ).rejects.toMatchObject({ code: 'CONTRACT_ERROR' });
  });
  it('does not make a private request after local expiration', async () => {
    await sessionToken.clear();
    const spy = jest.spyOn(api, 'request');
    await expect(
      apiRequest('GET', '/v1/users/me', z.unknown()),
    ).rejects.toMatchObject({ status: 401 });
    expect(spy).not.toHaveBeenCalled();
  });
  it('clears the current token on private 401', async () => {
    jest.spyOn(api, 'request').mockRejectedValue(failure(401));
    await expect(
      apiRequest('GET', '/v1/users/me', z.unknown()),
    ).rejects.toBeInstanceOf(ApiError);
    expect(sessionToken.get()).toBeNull();
  });
  it('an old 401 cannot destroy a newly established identity', async () => {
    jest.spyOn(api, 'request').mockImplementation(async () => {
      await sessionToken.set('b'.repeat(43), inOneMinute());
      throw failure(401);
    });
    await expect(
      apiRequest('GET', '/v1/users/me', z.unknown()),
    ).rejects.toMatchObject({ status: 401 });
    expect(sessionToken.get()).toBe('b'.repeat(43));
  });
  it('invalid login never clears an existing session', async () => {
    jest
      .spyOn(api, 'request')
      .mockRejectedValue(
        failure(401, { error: { code: 'INVALID_CREDENTIALS' } }),
      );
    await expect(
      apiRequest('POST', '/v1/auth/login', z.unknown(), {}, { public: true }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(sessionToken.get()).toBe(secret);
  });
  it('uses reviewed messages and preserves the request id', async () => {
    jest.spyOn(api, 'request').mockRejectedValue(
      failure(409, {
        error: {
          code: 'AVAILABILITY_OVERLAP',
          message: '<script>private details</script>',
        },
        requestId: 'request-123',
      }),
    );
    await expect(
      apiRequest('POST', '/v1/users/me/availability', z.unknown(), {}),
    ).rejects.toMatchObject({
      code: 'AVAILABILITY_OVERLAP',
      requestId: 'request-123',
      message: expect.stringContaining('sobrepõe'),
    });
  });
  it.each([
    [429, 'RATE_LIMITED'],
    [500, 'REQUEST_FAILED'],
  ])(
    'maps status %s without exposing raw server details',
    async (status, code) => {
      jest.spyOn(api, 'request').mockRejectedValue(failure(status as number));
      await expect(
        apiRequest('GET', '/v1/users/me', z.unknown()),
      ).rejects.toMatchObject({ code });
    },
  );
  it('maps timeouts', async () => {
    jest
      .spyOn(api, 'request')
      .mockRejectedValue(new AxiosError('raw', 'ECONNABORTED'));
    await expect(
      apiRequest('GET', '/v1/users/me', z.unknown()),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
  it('maps network errors', async () => {
    jest
      .spyOn(api, 'request')
      .mockRejectedValue(new AxiosError('raw', 'ERR_NETWORK'));
    await expect(
      apiRequest('GET', '/v1/users/me', z.unknown()),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
  it('handles non-Axios failures without leaking internals', async () => {
    jest.spyOn(api, 'request').mockRejectedValue(new Error('secret details'));
    await expect(
      apiRequest('GET', '/v1/users/me', z.unknown()),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
  it('preserves cancellation so abandoned queries do not become UI errors', async () => {
    const error = new CanceledError();
    jest.spyOn(api, 'request').mockRejectedValue(error);
    await expect(apiRequest('GET', '/v1/users/me', z.unknown())).rejects.toBe(
      error,
    );
  });
});
