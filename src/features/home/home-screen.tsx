import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { Logo } from '@/components/ace/logo';
import { ErrorState, LoadingState } from '@/components/ace/states';
import { Screen } from '@/components/ui/screen';
import { activityKeys } from '@/features/activity/api';
import { useSession } from '@/features/auth/session';
import { NotificationBell } from '@/features/notifications/notification-bell';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';

import {
  feedKey,
  homeKey,
  homeQuery,
  noticeKey,
  refreshRecommendations,
  type Home,
} from './api';
import { HomeSections } from './home-sections';
import {
  kindErrors,
  mergeFeed,
  noticeOf,
  refreshKey,
  type Notice,
} from './schemas';

/**
 * Início (T38): uma chamada agregada e, só quando as sugestões têm 24 h ou
 * mais, um refresh — no máximo duas chamadas por abertura.
 */
export function HomeScreen() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const home = useQuery(homeQuery);
  useRefetchOnFocus(home.refetch);
  // Aviso de sugestões novas: estado de sessão, limpo ao abrir "Para você".
  const notice = useQuery({
    queryKey: noticeKey,
    queryFn: (): Notice | null => null,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const refresh = useMutation({
    mutationFn: refreshRecommendations,
    retry: false,
    onSuccess: (feed) => {
      queryClient.setQueryData<Home>(homeKey, (current) =>
        current ? mergeFeed(current, feed) : current,
      );
      queryClient.setQueryData(feedKey(feed.sportId), feed);
      const next = noticeOf(feed);
      if (next) queryClient.setQueryData(noticeKey, next);
    },
  });
  // Um refresh por snapshot velho (a aba pode ficar montada por dias); a API
  // também só gera o tipo com 24 h ou mais.
  const attempted = useRef<string | null>(null);
  const key = home.data ? refreshKey(home.data) : null;
  const sportId = home.data?.suggestions?.sportId;
  useEffect(() => {
    if (!key || !sportId || attempted.current === key) return;
    attempted.current = key;
    refresh.mutate(sportId);
  }, [key, sportId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!user) return null;
  return (
    <Screen
      scroll
      edges={['top']}
      className='gap-5 pt-4'
      onRefresh={() =>
        Promise.all([
          home.refetch(),
          queryClient.invalidateQueries({ queryKey: activityKeys.feed }),
        ])
      }
    >
      <View className='flex-row items-center justify-between'>
        <Logo width={72} />
        <NotificationBell />
      </View>
      {home.isPending ? (
        <LoadingState label='Carregando seu início…' />
      ) : home.isError ? (
        <ErrorState error={home.error} retry={() => home.refetch()} />
      ) : (
        <HomeSections
          home={home.data}
          viewer={user}
          notice={notice.data ?? null}
          refreshing={refresh.isPending}
          errors={kindErrors(refresh.data)}
          onDismissNotice={() => queryClient.setQueryData(noticeKey, null)}
        />
      )}
    </Screen>
  );
}
