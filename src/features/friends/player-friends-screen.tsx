import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Lock, Users } from 'lucide-react-native';
import { View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/ace/states';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { PagedList } from '@/features/matches/paged-list';
import { playerProfileQuery } from '@/features/players/api';
import { ApiError } from '@/lib/api-client';
import { firstName } from '@/lib/utils';

import { friendsQuery } from './api';
import { PlayerRow } from './player-row';
import { sinceLabel } from './schemas';

/** Amigos de outro jogador; a API decide se a lista é visível (403 em privado). */
export function PlayerFriendsScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const profile = useQuery(playerProfileQuery(userId ?? ''));
  const friends = useInfiniteQuery({
    ...friendsQuery(userId ?? ''),
    enabled: Boolean(profile.data),
  });
  const items = friends.data?.pages.flatMap((page) => page.data) ?? [];
  if (profile.isPending) return <LoadingState label='Abrindo o perfil…' />;
  if (profile.isError)
    return (
      <ErrorState error={profile.error} retry={() => void profile.refetch()} />
    );
  const first = firstName(profile.data.fullName);
  const count = profile.data.friendsCount;
  // A lista não devolve `relationship`: é só quem, e desde quando (como no web).
  const isPrivate =
    friends.isError &&
    friends.error instanceof ApiError &&
    friends.error.code === 'PROFILE_PRIVATE';
  const header = (
    <View className='gap-1 pb-3 pt-4'>
      <Text className='font-inter-semibold text-xs uppercase tracking-widest text-brand'>
        {`A rede de ${first}`}
      </Text>
      <Text variant='title'>
        {`Amigos de ${first}`}
        <Text className='font-inter-bold text-2xl text-brand'>.</Text>
      </Text>
      <Text variant='muted'>
        {`${count} ${count === 1 ? 'amigo' : 'amigos'} no ACE.`}
      </Text>
    </View>
  );
  return (
    <Screen edges={['bottom']} className='px-0'>
      <Stack.Screen options={{ title: `Amigos de ${first}` }} />
      {isPrivate ? (
        <View className='px-5'>
          {header}
          <EmptyState
            icon={<Lock size={28} color={palette.colors.brand} />}
            title='Lista de amigos privada'
            description={`${first} mantém o perfil privado. Só amigos veem esta lista.`}
          />
        </View>
      ) : (
        <PagedList
          query={friends}
          header={header}
          empty={
            <EmptyState
              icon={<Users size={28} color={palette.colors.brand} />}
              title='Ainda sem amigos por aqui'
              description={`${first} ainda não adicionou ninguém.`}
            />
          }
          items={items.map((friend) => ({
            id: friend.user.id,
            data: friend,
            node: (
              <PlayerRow user={friend.user} meta={sinceLabel(friend.since)} />
            ),
          }))}
        />
      )}
    </Screen>
  );
}
