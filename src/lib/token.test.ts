import * as SecureStore from 'expo-secure-store';

import { sessionEnded } from './events';
import { sessionToken } from './token';

const { __store: store } = jest.requireMock('expo-secure-store') as {
  __store: Map<string, string>;
};
const secret = 'a'.repeat(43);
const inOneMinute = () => new Date(Date.now() + 60_000).toISOString();

beforeEach(async () => {
  jest.useRealTimers();
  await sessionToken.clear();
  store.clear();
  jest.clearAllMocks();
});
// Limpa o timer de expiração para o worker do Jest encerrar sem pendências.
afterAll(() => sessionToken.clear());

describe('sessionToken', () => {
  it('keeps the credential in memory and in SecureStore (device only)', async () => {
    await sessionToken.set(secret, inOneMinute());
    expect(sessionToken.get()).toBe(secret);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'ace.session',
      expect.stringContaining(secret),
      { keychainAccessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' },
    );
  });
  it('restores a valid persisted credential on load', async () => {
    store.set(
      'ace.session',
      JSON.stringify({ token: secret, expiresAt: Date.now() + 60_000 }),
    );
    await expect(sessionToken.load()).resolves.toBe(secret);
    expect(sessionToken.get()).toBe(secret);
  });
  it('discards and deletes an expired credential on load', async () => {
    store.set(
      'ace.session',
      JSON.stringify({ token: secret, expiresAt: Date.now() - 1 }),
    );
    await expect(sessionToken.load()).resolves.toBeNull();
    expect(sessionToken.get()).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'ace.session',
      expect.anything(),
    );
  });
  it.each([
    'not json',
    JSON.stringify({ token: 'short', expiresAt: Date.now() + 60_000 }),
    JSON.stringify({ token: secret }),
  ])('treats corrupted storage %# as no session', async (raw) => {
    store.set('ace.session', raw);
    await expect(sessionToken.load()).resolves.toBeNull();
    expect(sessionToken.get()).toBeNull();
  });
  it('returns null after local expiration even without a timer tick', async () => {
    await sessionToken.set(secret, new Date(Date.now() - 1).toISOString());
    expect(sessionToken.get()).toBeNull();
  });
  it('clear removes the stored credential and notifies only when asked', async () => {
    const listener = jest.fn();
    const stop = sessionEnded.subscribe(listener);
    await sessionToken.set(secret, inOneMinute());
    await sessionToken.clear();
    expect(store.has('ace.session')).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    await sessionToken.set(secret, inOneMinute());
    await sessionToken.clear(true);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });
  it('keeps a 30-day session alive past the setTimeout ceiling', async () => {
    jest.useFakeTimers();
    const day = 24 * 60 * 60_000;
    await sessionToken.set(
      secret,
      new Date(Date.now() + 30 * day).toISOString(),
    );
    await jest.advanceTimersByTimeAsync(29 * day);
    expect(sessionToken.get()).toBe(secret);
    await jest.advanceTimersByTimeAsync(2 * day);
    expect(sessionToken.get()).toBeNull();
  });
  it('ends the session when the expiry timer fires', async () => {
    jest.useFakeTimers();
    const listener = jest.fn();
    const stop = sessionEnded.subscribe(listener);
    await sessionToken.set(secret, new Date(Date.now() + 1_000).toISOString());
    await jest.advanceTimersByTimeAsync(1_000);
    // `clear` aguarda o SecureStore antes de emitir; dá tempo às microtasks.
    await Promise.resolve();
    await Promise.resolve();
    expect(sessionToken.get()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });
});
