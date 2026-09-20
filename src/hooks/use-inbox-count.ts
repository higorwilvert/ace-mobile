import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/lib/api-client';

const LIMIT = 50;
// Schema mínimo: `hooks` não importa `features`, e só o tamanho da página
// interessa aqui.
const page = z.object({
  data: z.array(z.object({ id: z.string() })),
  meta: z.object({ nextCursor: z.string().nullable() }),
});
type Page = z.infer<typeof page>;
const count = (res: Page) => res.data.length + (res.meta.nextCursor ? 1 : 0);
export const inboxKey = ['private', 'inbox'] as const;

/**
 * Convites (T31) e pedidos de amizade (T33) recebidos aguardando resposta.
 * Sem endpoint de contagem na API, a primeira página (limite 50) de cada
 * caixa dá o número real até 50 e "50+" além disso. Atualiza a cada minuto
 * e sempre que uma ação de convite ou social invalida a chave.
 */
export function useInboxCount() {
  const query = useQuery({
    queryKey: inboxKey,
    queryFn: async ({ signal }) => {
      const [invites, requests] = await Promise.all([
        apiRequest('GET', '/v1/users/me/invites', page, undefined, {
          signal,
          params: { direction: 'received', status: 'PENDING', limit: LIMIT },
        }),
        apiRequest('GET', '/v1/users/me/friend-requests', page, undefined, {
          signal,
          params: { direction: 'received', limit: LIMIT },
        }),
      ]);
      return { invites: count(invites), friendRequests: count(requests) };
    },
    staleTime: 10_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  return {
    invites: query.data?.invites ?? 0,
    friendRequests: query.data?.friendRequests ?? 0,
    /** `undefined` esconde o badge; "50+" além da primeira página. */
    label: (n: number) =>
      n === 0 ? undefined : n > LIMIT ? `${LIMIT}+` : String(n),
  };
}
