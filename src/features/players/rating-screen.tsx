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
import {
  historyQuery,
  summaryQuery,
  type RatingChange,
} from '@/features/results/api';
import { HistoryEntryCard } from '@/features/results/history-entry';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';

import { playerProfileQuery } from './api';
import { DivisionCard, DivisionLadder } from './division-card';
import { RatingChangeDetails } from './rating-card';

/**
 * "Rating e evolução" do próprio jogador (T32 + T39): a divisão de uma
 * modalidade, a escada das 12 divisões (tabela da API) e a evolução por
 * partida (`ratingChange`, T11). Nenhum cálculo aqui: divisão, confiança e
 * valores vêm persistidos da API.
 */
export function RatingScreen() {
  const { user } = useSession();
  const router = useRouter();
  const profile = useQuery(playerProfileQuery(user?.id ?? ''));
  const totals = useQuery(summaryQuery(user?.id ?? ''));
  const [picked, setPicked] = useState<number>();
  const sports = profile.data?.sportProfiles ?? [];
  // A principal vem primeiro na API; a escolha só muda a modalidade exibida.
  const sport = sports.find((p) => p.sportId === picked) ?? sports[0];
  const history = useInfiniteQuery({
    ...historyQuery('me', sport?.sportId),
    enabled: sport !== undefined,
  });
  const [selected, setSelected] = useState<RatingChange | null>(null);
  useRefetchOnFocus(history.refetch);
  useRefetchOnFocus(profile.refetch);
  const brand = palette.colors.brand;
  if (profile.isPending) return <LoadingState label='Buscando seu rating…' />;
  if (profile.isError)
    return <ErrorState error={profile.error} retry={() => profile.refetch()} />;
  if (!sport)
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon={<TrendingUp size={28} color={brand} />}
          title='Adicione uma modalidade para começar'
          description='Escolha a categoria em que você joga para definir sua divisão inicial.'
        >
          <View className='w-full pt-2'>
            <Button
              label='Adicionar modalidade'
              onPress={() => router.push('/sports')}
            />
          </View>
        </EmptyState>
      </Screen>
    );
  const entries = history.data?.pages.flatMap((page) => page.data) ?? [];
  const header = (
    <View className='gap-4 pb-4 pt-2'>
      <View className='gap-1'>
        <Text variant='muted'>
          A categoria declarada define a estimativa inicial. Depois, o Glicko-2
          acompanha os resultados e a divisão muda junto. Alterar a categoria
          não reinicia essa evolução.
        </Text>
      </View>
      {sports.length > 1 && (
        <Chips
          label='Modalidade'
          value={String(sport.sportId)}
          clearable={false}
          onChange={(value) => setPicked(Number(value))}
          options={sports.map((p) => ({
            value: String(p.sportId),
            label: p.sport.name,
          }))}
        />
      )}
      <DivisionCard
        profile={sport}
        record={totals.data?.find((t) => t.sportId === sport.sportId)}
        own
        technicalOpen
      />
      <View className='gap-1 pt-2'>
        <Text variant='subtitle'>Como funcionam as divisões</Text>
        <Text variant='muted'>
          Seis faixas com dois níveis cada, iguais em todas as modalidades. Quem
          começa pela categoria declarada aparece como estimativa inicial até o
          primeiro resultado.
        </Text>
      </View>
      <DivisionLadder sportId={sport.sportId} current={sport.rating?.tier} />
      <View className='gap-1 pt-2'>
        <Text variant='subtitle'>Evolução por partida</Text>
        <Text variant='muted'>
          {`Rating de ${sport.sport.name} antes e depois de cada resultado. Toque na variação para ver os valores registrados pela API.`}
        </Text>
      </View>
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
              title='Sua evolução começa com o primeiro resultado'
              description='Depois de registrar o placar, você verá aqui os valores antes e depois de cada partida, processados pelo ACE.'
            >
              <Button
                variant='secondary'
                label='Ver minhas partidas'
                onPress={() => router.push('/mine')}
              />
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
