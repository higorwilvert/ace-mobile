import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { ApiError } from '@/lib/api-client';

import { type MatchDetail, matchKeys } from './api';

/**
 * Mutação de partida/candidatura: avisa por toast, grava o detalhe devolvido
 * pela API e invalida listas e detalhe ao terminar (sucesso ou conflito),
 * para vagas e times refletirem a realidade sem refresh manual.
 */
export function useMatchMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    matchId?: string;
    success?: string | ((data: TData) => string);
    toastError?: boolean;
    onSuccess?: (data: TData) => void;
  } = {},
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      const detail = (data as { data?: MatchDetail } | undefined)?.data;
      if (options.matchId && detail && 'teams' in detail)
        queryClient.setQueryData(matchKeys.detail(options.matchId), detail);
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
        queryClient.invalidateQueries({ queryKey: matchKeys.all }),
        queryClient.invalidateQueries({
          queryKey: ['private', 'my-applications'],
        }),
      ]),
  });
}
