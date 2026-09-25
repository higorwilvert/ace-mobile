import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';

import { Avatar } from '@/components/ace/avatar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { cn } from '@/lib/utils';

import {
  markAllRead,
  markRead,
  notificationKeys,
  notificationsQuery,
  targetHref,
  type AppNotification,
} from './api';

const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
function ago(iso: string) {
  const minutes = Math.round((Date.parse(iso) - Date.now()) / 60_000);
  if (minutes > -60) return relative.format(minutes, 'minute');
  if (minutes > -1440) return relative.format(Math.round(minutes / 60), 'hour');
  return relative.format(Math.round(minutes / 1440), 'day');
}

/** Caixa de notificações (T41): toque marca como lida e abre o alvo. */
export function NotificationsScreen() {
  const queryClient = useQueryClient();
  const list = useInfiniteQuery(notificationsQuery);
  const items = list.data?.pages.flatMap((page) => page.data) ?? [];
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  const readAll = useMutation({ mutationFn: markAllRead, onSettled: refresh });

  function open(n: AppNotification) {
    if (!n.readAt) void markRead(n.id).finally(refresh);
    const href = targetHref(n.target);
    if (href) router.push(href);
  }

  if (list.isPending) return <LoadingState label='Carregando notificações…' />;
  if (list.isError)
    return <ErrorState error={list.error} retry={() => list.refetch()} />;
  return (
    <FlatList
      className='flex-1 bg-background'
      data={items}
      keyExtractor={(n) => n.id}
      contentContainerClassName='gap-2 px-5 pb-10 pt-4'
      refreshing={list.isRefetching && !list.isFetchingNextPage}
      onRefresh={() => void list.refetch()}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (list.hasNextPage && !list.isFetchingNextPage)
          void list.fetchNextPage();
      }}
      ListHeaderComponent={
        items.some((n) => !n.readAt) ? (
          <View className='items-end'>
            <Button
              variant='ghost'
              className='h-10'
              label='Marcar todas como lidas'
              busy={readAll.isPending}
              onPress={() => readAll.mutate()}
            />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          icon={<Bell size={28} color={palette.colors.brand} />}
          title='Nada por aqui ainda'
          description='Convites, candidaturas e avisos das suas partidas aparecem aqui.'
        />
      }
      renderItem={({ item: n }) => (
        <Pressable
          accessibilityRole='button'
          accessibilityHint={n.readAt ? undefined : 'Não lida'}
          onPress={() => open(n)}
          className={cn(
            'flex-row gap-3 rounded-card border border-border p-3 active:opacity-80',
            n.readAt ? 'bg-card' : 'bg-brand-muted',
          )}
        >
          <Avatar
            name={n.actor?.fullName ?? 'ACE'}
            url={n.actor?.avatarUrl}
            size={40}
          />
          <View className='flex-1 gap-0.5'>
            <Text variant='label'>{n.title}</Text>
            <Text variant='muted'>{n.body}</Text>
            <Text variant='muted' className='text-xs'>
              {ago(n.createdAt)}
            </Text>
          </View>
          {!n.readAt && (
            <View className='mt-1.5 h-2 w-2 rounded-full bg-brand' />
          )}
        </Pressable>
      )}
      ListFooterComponent={
        list.isFetchingNextPage ? (
          <ActivityIndicator color={palette.colors.brand} />
        ) : null
      }
    />
  );
}
