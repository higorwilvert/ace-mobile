import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { matchKeys } from '@/features/matches/api';
import { inboxKey } from '@/hooks/use-inbox-count';
import { ApiError } from '@/lib/api-client';

import { historyKeys } from './api';

/**
 * Registro de resultado: avisa por toast e invalida partidas, histórico e
 * perfis ao terminar (sucesso ou conflito) — a partida vira COMPLETED e
 * entra no histórico, nos totais e no rating de todos os participantes.
 */
export function useResultMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    success?: string | ((data: TData) => string);
    toastError?: boolean;
    onSuccess?: (data: TData) => void;
    onError?: (error: unknown) => void;
  } = {},
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (options.success)
        toast.success(
          typeof options.success === 'function'
            ? options.success(data)
            : options.success,
        );
      options.onSuccess?.(data);
    },
    onError: (error) => {
      options.onError?.(error);
      if (options.toastError === false) return;
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível concluir. Tente novamente.',
      );
    },
    onSettled: () =>
      Promise.all(
        [
          matchKeys.all,
          ['private', 'my-applications'],
          historyKeys.all,
          ['private', 'player'],
          ['private', 'sport-profiles'],
          inboxKey,
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });
}
