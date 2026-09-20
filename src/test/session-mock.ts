import { useSession } from '@/features/auth/session';
import { sessionToken } from '@/lib/token';

type SessionValue = ReturnType<typeof useSession>;

/** Use após `jest.mock('@/features/auth/session')` no arquivo de teste. */
export function mockSession(overrides: Partial<SessionValue> = {}) {
  const value: SessionValue = {
    status: 'signed-out',
    user: null,
    expired: false,
    bootError: null,
    signIn: jest.fn(async () => {}),
    signOut: jest.fn(async () => {}),
    ...overrides,
  };
  jest.mocked(useSession).mockReturnValue(value);
  return value;
}

/** Telas privadas passam por `apiRequest`, que exige um token guardado. */
export const seedToken = () =>
  sessionToken.set(
    'a'.repeat(43),
    new Date(Date.now() + 60 * 60_000).toISOString(),
  );
