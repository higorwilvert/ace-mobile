import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement } from 'react';

const clients = new Set<QueryClient>();
// Consultas com `refetchInterval`/`gcTime` deixam timers vivos depois do
// teste; limpar o cache ao fim de cada um deixa o Jest encerrar sozinho.
afterEach(() => {
  clients.forEach((client) => client.clear());
  clients.clear();
});

/** Renderiza com um QueryClient isolado (mutations/queries sem retry). */
export function renderWithQuery(ui: ReactElement, options?: RenderOptions) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  clients.add(client);
  const result = render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
    options,
  );
  return { ...result, queryClient: client };
}
