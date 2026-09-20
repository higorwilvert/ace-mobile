import { env, resolveApiUrl } from './env';

describe('resolveApiUrl', () => {
  it('accepts an explicit origin and normalizes it', () => {
    expect(
      resolveApiUrl({
        value: ' HTTP://Localhost:3001/ ',
        hostUri: undefined,
        dev: true,
      }),
    ).toBe('http://localhost:3001');
    expect(
      resolveApiUrl({
        value: 'https://api.ace.test',
        hostUri: undefined,
        dev: true,
      }),
    ).toBe('https://api.ace.test');
  });
  it.each([
    'http://user:pw@api.test',
    'https://api.test/v1',
    'https://api.test/?x=1',
    'https://api.test/#frag',
    'ftp://api.test',
    'api.test',
    'https://api.test:99999',
  ])('rejects %s', (value) => {
    expect(() =>
      resolveApiUrl({ value, hostUri: undefined, dev: true }),
    ).toThrow('EXPO_PUBLIC_API_URL inválida');
  });
  it('requires HTTPS outside development', () => {
    expect(() =>
      resolveApiUrl({
        value: 'http://api.test',
        hostUri: undefined,
        dev: false,
      }),
    ).toThrow('HTTPS');
    expect(
      resolveApiUrl({
        value: 'https://api.test',
        hostUri: undefined,
        dev: false,
      }),
    ).toBe('https://api.test');
  });
  it('derives the Metro host on port 3001 in development when unset', () => {
    expect(
      resolveApiUrl({
        value: undefined,
        hostUri: '192.168.0.10:8081',
        dev: true,
      }),
    ).toBe('http://192.168.0.10:3001');
    expect(
      resolveApiUrl({ value: '', hostUri: '192.168.0.10:8081', dev: true }),
    ).toBe('http://192.168.0.10:3001');
  });
  it('has no fallback outside development', () => {
    expect(() =>
      resolveApiUrl({
        value: undefined,
        hostUri: '192.168.0.10:8081',
        dev: false,
      }),
    ).toThrow('EXPO_PUBLIC_API_URL inválida');
  });
  it('exposes the resolved origin for the test environment', () => {
    expect(env.API_URL).toBe('http://localhost:3001');
  });
});
