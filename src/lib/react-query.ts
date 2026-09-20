import {
  type DefaultOptions,
  focusManager,
  QueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

export const queryConfig = {
  queries: {
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 1000 * 60,
  },
} satisfies DefaultOptions;

export const queryClient = new QueryClient({ defaultOptions: queryConfig });

/** No mobile "foco" é o app voltar ao primeiro plano. Retorna o unsubscribe. */
export function bindAppStateToQueryFocus() {
  const subscription = AppState.addEventListener(
    'change',
    (status: AppStateStatus) => focusManager.setFocused(status === 'active'),
  );
  return () => subscription.remove();
}

export type ApiFnReturnType<FnType extends (...args: any) => Promise<any>> =
  Awaited<ReturnType<FnType>>;

export type MutationConfig<
  MutationFnType extends (...args: any) => Promise<any>,
> = UseMutationOptions<
  ApiFnReturnType<MutationFnType>,
  Error,
  Parameters<MutationFnType>[0]
>;
