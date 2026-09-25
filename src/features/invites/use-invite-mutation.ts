import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { type MatchDetail, matchKeys } from '@/features/matches/api';
import { inboxKey } from '@/hooks/use-inbox-count';
import { ApiError } from '@/lib/api-client';

import { inviteKeys } from './api';

/**
 * Mutação de convite: avisa por toast e invalida convites, partidas,
 * candidaturas e o contador de pendências ao terminar (sucesso ou conflito):
 * um aceite muda vagas e times da partida, então o detalhe também recarrega.
 */
export function useInviteMutation<TVariables, TData>(
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
        queryClient.invalidateQueries({ queryKey: inviteKeys.all }),
        queryClient.invalidateQueries({ queryKey: matchKeys.all }),
        queryClient.invalidateQueries({
          queryKey: ['private', 'my-applications'],
        }),
        queryClient.invalidateQueries({ queryKey: inboxKey }),
        queryClient.invalidateQueries({ queryKey: ['private', 'home'] }),
      ]),
  });
}
