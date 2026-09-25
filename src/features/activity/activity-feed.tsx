import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { MessageCircle, Users } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ace/avatar';
import { SportIcon } from '@/components/ace/sport-icon';
import { ErrorState, LoadingState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { activityLine, generatedLabel } from '@/features/home/schemas';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';

import { feedQuery, type FeedItem } from './api';
import { LikeButton } from './like-button';
import { MatchImage } from './match-social';

const brand = palette.colors.brand;
const muted = palette.colors['muted-foreground'];

/** Feed do Início (T36): minhas partidas e as dos amigos, estilo Strava. */
export function ActivityFeed({ viewerId }: { viewerId: string }) {
  const router = useRouter();
  const feed = useInfiniteQuery(feedQuery);
  useRefetchOnFocus(feed.refetch);
  const items = feed.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <View className='gap-3 rounded-panel border border-border bg-card p-4'>
      <Text variant='subtitle'>Atividade</Text>
      {feed.isPending ? (
        <LoadingState label='Carregando a atividade…' />
      ) : feed.isError ? (
        <ErrorState error={feed.error} retry={() => feed.refetch()} />
      ) : items.length ? (
        <>
          {items.map((item) => (
            <FeedCard key={item.match.id} item={item} viewerId={viewerId} />
          ))}
          {feed.hasNextPage && (
            <Button
              variant='ghost'
              label='Carregar mais'
              busy={feed.isFetchingNextPage}
              onPress={() => void feed.fetchNextPage()}
            />
          )}
        </>
      ) : (
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Encontrar jogadores'
          className='min-h-12 flex-row items-center gap-3 rounded-card bg-background px-3 py-2.5 active:opacity-80'
          onPress={() => router.push('/players')}
        >
          <Users size={20} color={brand} />
          <View className='flex-1 gap-0.5'>
            <Text variant='label'>Nada por aqui ainda</Text>
            <Text variant='muted'>
              Quando você ou seus amigos registrarem resultados, eles aparecem
              aqui.
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

export function FeedCard({
  item,
  viewerId,
}: {
  item: FeedItem;
  viewerId: string;
}) {
  const router = useRouter();
  const line = activityLine(item, viewerId);
  const players = item.teams.flatMap((team) => team.players);
  // A foto mais recente abre o card, como no Strava; as outras ficam no detalhe.
  const cover = item.photos.at(-1);
  const { match } = item;
  const open = () => router.push(`/matches/${match.id}`);
  return (
    <View className='gap-3 rounded-card bg-background p-3'>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={`${line.title}. ${line.score} · ${match.sport.name} · ${generatedLabel(item.result.recordedAt)}`}
        className='gap-3 active:opacity-80'
        onPress={open}
      >
        <View className='flex-row items-center gap-3'>
          <View
            className='flex-row'
            importantForAccessibility='no-hide-descendants'
          >
            {players.slice(0, 4).map((p, i) => (
              <Avatar
                key={p.id}
                name={p.fullName}
                url={p.avatarUrl}
                size={28}
                className={
                  i ? '-ml-2 border-2 border-card' : 'border-2 border-card'
                }
              />
            ))}
          </View>
          <View className='flex-1 gap-0.5'>
            <Text variant='label' numberOfLines={2}>
              {line.title}
            </Text>
            <Text variant='muted' numberOfLines={1}>
              {`${match.sport.name} · ${generatedLabel(item.result.recordedAt)} · ${match.arena?.name ?? match.locationText ?? match.city}`}
            </Text>
          </View>
          <SportIcon slug={match.sport.slug} size={28} />
        </View>
        <Text className='font-inter-bold text-2xl text-navy'>{line.score}</Text>
        {cover && (
          <View className='overflow-hidden rounded-card bg-muted'>
            <MatchImage
              url={cover.url}
              label={`Foto da partida enviada por ${cover.uploadedBy.fullName}`}
              style={{ width: '100%', aspectRatio: 16 / 9 }}
            />
            {item.photos.length > 1 && (
              <View className='absolute bottom-2 right-2 rounded-tiny bg-navy px-2 py-0.5'>
                <Text className='font-inter-semibold text-sm text-white'>
                  {`+${item.photos.length - 1}`}
                </Text>
              </View>
            )}
          </View>
        )}
      </Pressable>
      <View className='flex-row items-center gap-5'>
        <LikeButton matchId={match.id} state={item} />
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={
            item.commentCount ? `${item.commentCount} comentários` : 'Comentar'
          }
          hitSlop={8}
          className='min-h-10 flex-row items-center gap-1.5 active:opacity-70'
          onPress={open}
        >
          <MessageCircle size={18} color={muted} />
          <Text className='font-inter-semibold text-sm text-muted-foreground'>
            {item.commentCount ? String(item.commentCount) : 'Comentar'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
