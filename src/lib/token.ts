import * as SecureStore from 'expo-secure-store';

import { sessionEnded } from './events';

// A API usa Bearer opaco absoluto (30 dias) e sem refresh. O token vive em
// memória e é persistido só no SecureStore (Keychain/Keystore): nunca em
// AsyncStorage, no cache do React Query ou em logs.
const STORAGE_KEY = 'ace.session';
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
// setTimeout estoura acima de 2^31-1 ms (24,8 dias); o timer se reagenda.
const MAX_TIMER_MS = 2 ** 31 - 1;
const storeOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

type Credential = { token: string; expiresAt: number };
let credential: Credential | null = null;
let expirationTimer: ReturnType<typeof setTimeout> | undefined;

function schedule(expiresAt: number) {
  clearTimeout(expirationTimer);
  expirationTimer = setTimeout(
    () => {
      if (expiresAt > Date.now()) schedule(expiresAt);
      else void sessionToken.clear(true);
    },
    Math.min(MAX_TIMER_MS, Math.max(0, expiresAt - Date.now())),
  );
}

function isCredential(value: unknown): value is Credential {
  if (typeof value !== 'object' || value === null) return false;
  const { token, expiresAt } = value as Partial<Credential>;
  return (
    typeof token === 'string' &&
    TOKEN_PATTERN.test(token) &&
    typeof expiresAt === 'number' &&
    Number.isFinite(expiresAt)
  );
}

export const sessionToken = {
  /** Token atual ou `null` quando não há sessão ou ela expirou. */
  get() {
    if (!credential || credential.expiresAt <= Date.now()) return null;
    return credential.token;
  },
  /**
   * Restaura a credencial persistida (uma vez, no boot). Expirada ou
   * corrompida é descartada; falha de leitura vale como "sem sessão".
   */
  async load() {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY, storeOptions);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!isCredential(parsed) || parsed.expiresAt <= Date.now()) {
        await SecureStore.deleteItemAsync(STORAGE_KEY, storeOptions);
        return null;
      }
      credential = { token: parsed.token, expiresAt: parsed.expiresAt };
      schedule(credential.expiresAt);
      return credential.token;
    } catch {
      return null;
    }
  },
  async set(token: string, expiresAt: string) {
    credential = { token, expiresAt: Date.parse(expiresAt) };
    schedule(credential.expiresAt);
    await SecureStore.setItemAsync(
      STORAGE_KEY,
      JSON.stringify(credential),
      storeOptions,
    );
  },
  async clear(notify = false) {
    credential = null;
    clearTimeout(expirationTimer);
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY, storeOptions);
    } catch {
      // Sem credencial em memória o app já está deslogado; o próximo `load`
      // descarta qualquer resto que tenha ficado no armazenamento.
    }
    if (notify) sessionEnded.emit();
  },
};
