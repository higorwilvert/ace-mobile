import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { TrendingUp } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { useSession } from '@/features/auth/session';
import { historyQuery, type RatingChange } from '@/features/results/api';
import { HistoryEntryCard } from '@/features/results/history-entry';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';

import { playerProfileQuery } from './api';
import { RatingCard, RatingChangeDetails } from './rating-card';

/**
 * Rating Glicko-2 do próprio jogador (RNF12): o atual por modalidade vem do
 * perfil (`player_ratings`), a evolução do histórico com `ratingChange`
 * (T11). Nenhum cálculo aqui — só os valores persistidos pela API.
 */
export function RatingScreen() {
  const { user } = useSession();
  const router = useRouter();
  const profile = useQuery(playerProfileQuery(user?.id ?? ''));
  const [sportId, setSportId] = useState<number>();
  const history = useInfiniteQuery(historyQuery('me', sportId));
  const [selected, setSelected] = useState<RatingChange | null>(null);
  useRefetchOnFocus(history.refetch);
  useRefetchOnFocus(profile.refetch);
  const brand = palette.colors.brand;
  if (profile.isPending) return <LoadingState label='Buscando seu rating…' />;
  if (profile.isError)
    return <ErrorState error={profile.error} retry={() => profile.refetch()} />;
  const sports = profile.data.sportProfiles;
  const entries = history.data?.pages.flatMap((page) => page.data) ?? [];
  const header = (
    <View className='gap-4 pb-4 pt-2'>
      <View className='gap-1'>
        <Text className='font-inter-semibold text-xs uppercase tracking-widest text-brand'>
          Seu nível em evolução
        </Text>
        <Text variant='title'>
          Rating
          <Text className='font-inter-bold text-2xl text-brand'>.</Text>
        </Text>
        <Text variant='muted'>
          A categoria declarada define a estimativa inicial. O Glicko-2
          acompanha sua evolução pelos resultados e pela incerteza dos ratings.
          Alterar a categoria depois não reinicia essa evolução.
        </Text>
      </View>
      {sports.length === 0 ? (
        <EmptyState
          icon={<TrendingUp size={28} color={brand} />}
          title='Adicione uma modalidade para começar'
          description='Escolha a categoria em que você joga para definir sua estimativa inicial.'
        >
          <View className='w-full pt-2'>
            <Button
              label='Adicionar modalidade'
              onPress={() => router.push('/sports')}
            />
          </View>
        </EmptyState>
      ) : (
        sports.map((p) => <RatingCard key={p.sportId} profile={p} />)
      )}
      <View className='gap-1 pt-2'>
        <Text variant='subtitle'>Evolução por partida</Text>
        <Text variant='muted'>
          Toque na variação para ver os valores registrados pela API.
        </Text>
      </View>
      {sports.length > 0 && (
        <Chips
          label='Modalidade da evolução'
          value={sportId ? String(sportId) : undefined}
          onChange={(value) => setSportId(value ? Number(value) : undefined)}
          options={sports.map((p) => ({
            value: String(p.sportId),
            label: p.sport.name,
          }))}
        />
      )}
    </View>
  );
  return (
    <Screen edges={['bottom']} className='px-0'>
      <FlatList
        data={history.isPending ? [] : entries}
        keyExtractor={(entry) => `${entry.match.id}-${entry.teamIndex}`}
        contentContainerClassName='gap-3 px-5 pb-8'
        ListHeaderComponent={header}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (history.hasNextPage && !history.isFetchingNextPage)
            void history.fetchNextPage();
        }}
        ListEmptyComponent={
          history.isPending ? (
            <ActivityIndicator
              color={brand}
              className='py-6'
              accessibilityRole='progressbar'
            />
          ) : history.isError ? (
            <ErrorState error={history.error} retry={() => history.refetch()} />
          ) : (
            <EmptyState
              icon={<TrendingUp size={28} color={brand} />}
              title={
                sportId
                  ? 'Nada nesta modalidade ainda'
                  : 'Sua evolução começa com o primeiro resultado'
              }
              description={
                sportId
                  ? 'Toque na modalidade de novo para ver todas.'
                  : 'Depois de registrar o placar, você verá aqui os valores antes e depois de cada partida, processados pelo ACE.'
              }
            >
              {!sportId && (
                <Button
                  variant='secondary'
                  label='Ver minhas partidas'
                  onPress={() => router.push('/mine')}
                />
              )}
            </EmptyState>
          )
        }
        renderItem={({ item }) => (
          <HistoryEntryCard
            entry={item}
            showRating
            onRatingPress={setSelected}
          />
        )}
        ListFooterComponent={
          history.isFetchingNextPage ? (
            <ActivityIndicator color={brand} className='py-4' />
          ) : history.hasNextPage ? (
            <Button
              variant='secondary'
              label='Carregar mais'
              onPress={() => void history.fetchNextPage()}
            />
          ) : null
        }
      />
      <Sheet
        visible={selected !== null}
        title='Detalhes do processamento'
        onClose={() => setSelected(null)}
      >
        {selected && <RatingChangeDetails change={selected} />}
      </Sheet>
    </Screen>
  );
}
