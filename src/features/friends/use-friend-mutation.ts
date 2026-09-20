import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { inboxKey } from '@/hooks/use-inbox-count';
import { ApiError } from '@/lib/api-client';

import { friendKeys } from './api';

/**
 * Mutação social: avisa por toast e invalida amigos, pedidos, busca, perfis
 * e o contador de pendências ao terminar (sucesso ou recusa), para que a
 * relação mostrada em qualquer tela reflita a resposta real da API.
 */
export function useFriendMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    success?: string | ((data: TData) => string);
    toastError?: boolean;
    onSuccess?: (data: TData) => void;
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
      if (options.toastError === false) return;
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível concluir. Tente novamente.',
      );
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: friendKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['private', 'player'] }),
        queryClient.invalidateQueries({ queryKey: ['private', 'search'] }),
        queryClient.invalidateQueries({ queryKey: inboxKey }),
      ]),
  });
}
