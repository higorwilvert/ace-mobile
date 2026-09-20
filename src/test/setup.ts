// Mocks globais: módulos nativos sem implementação no Jest.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __store: store,
  };
});

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: 'localhost:8081' } },
}));

jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>(
      'react-native-safe-area-context/jest/mock',
    ).default,
);

jest.mock('sonner-native', () => ({
  Toaster: () => null,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

// O token agenda um timer de expiração; sem limpar, o Jest fica preso no
// encerramento de suítes que semeiam sessão (`seedToken`).
afterEach(async () => {
  const { sessionToken } =
    jest.requireActual<typeof import('@/lib/token')>('@/lib/token');
  await sessionToken.clear();
});

// Reanimated 4: mocks oficiais (worklets primeiro) + o que ainda não cobrem.
jest.mock('react-native-worklets', () =>
  jest.requireActual('react-native-worklets/src/mock'),
);
jest.mock('react-native-reanimated', () =>
  jest.requireActual('react-native-reanimated/mock'),
);

// Telas com várias consultas do React Query resolvem respostas entre uma
// sondagem e outra do `waitFor`, o que dispara o aviso "not wrapped in
// act(...)" sem indicar defeito (recomendação da própria TanStack). Só esse
// aviso é filtrado; qualquer outro `console.error` continua visível.
// (Atribuição direta, não `spyOn`: os `restoreAllMocks` das suítes desfariam o espião.)
const consoleError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('not wrapped in act'))
    return;
  consoleError(...args);
};
