import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Lock, Trophy } from 'lucide-react-native';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { EmptyState, ErrorState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { playerProfileQuery } from '@/features/players/api';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { ApiError } from '@/lib/api-client';
import { firstName } from '@/lib/utils';

import { historyQuery, summaryQuery } from './api';
import { HistoryEntryCard } from './history-entry';
import { historySearchSchema } from './schemas';
import { TotalsTiles } from './totals-tiles';

/**
 * Histórico paginado com totais por modalidade (RF24/RF25). Sem `userId`
 * mostra o meu; com `userId`, o de outro jogador (rota pública, respeita o
 * perfil privado). As tiles são o filtro de modalidade, gravado nos params.
 */
export function HistoryScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const router = useRouter();
  const search = useMemo(() => historySearchSchema.parse(params), [params]);
  const userId = search.userId ?? 'me';
  const mine = userId === 'me';
  const summary = useQuery(summaryQuery(userId));
  const history = useInfiniteQuery(historyQuery(userId, search.sportId));
  const player = useQuery({ ...playerProfileQuery(userId), enabled: !mine });
  useRefetchOnFocus(history.refetch);
  const pick = (sportId: number | undefined) =>
    router.setParams({
      sportId: sportId ? String(sportId) : '',
      userId: search.userId ?? '',
    });
  const entries = history.data?.pages.flatMap((page) => page.data) ?? [];
  const brand = palette.colors.brand;
  const privateProfile =
    (summary.error instanceof ApiError && summary.error.status === 403) ||
    (history.error instanceof ApiError && history.error.status === 403);
  const title = mine
    ? 'Seu histórico'
    : player.data
      ? `Histórico de ${firstName(player.data.fullName)}`
      : 'Histórico';

  const header = (
    <View className='gap-4 pb-4 pt-2'>
      <View className='gap-1'>
        <Text className='font-inter-semibold text-xs uppercase tracking-widest text-brand'>
          Placares e totais
        </Text>
        <Text variant='title'>
          {title}
          <Text className='font-inter-bold text-2xl text-brand'>.</Text>
        </Text>
        <Text variant='muted'>
          {mine
            ? 'Toque numa modalidade para filtrar. Os totais saem das mesmas partidas da lista.'
            : 'Só partidas públicas aparecem para outros jogadores.'}
        </Text>
      </View>
      {summary.isPending ? (
        <ActivityIndicator color={brand} />
      ) : summary.isError ? (
        privateProfile ? null : (
          <ErrorState error={summary.error} retry={() => summary.refetch()} />
        )
      ) : summary.data.length > 0 ? (
        <TotalsTiles
          totals={summary.data}
          active={search.sportId}
          onPick={pick}
        />
      ) : null}
    </View>
  );

  if (privateProfile)
    return (
      <Screen edges={['bottom']} className='justify-center'>
        <EmptyState
          icon={<Lock size={28} color={brand} />}
          title='Este histórico é privado'
          description='Só amigos veem o histórico deste jogador.'
        >
          <Button label='Voltar' onPress={() => router.back()} />
        </EmptyState>
      </Screen>
    );
  if (history.isError)
    return (
      <Screen edges={['bottom']} className='px-0'>
        <View className='px-5'>{header}</View>
        <ErrorState error={history.error} retry={() => history.refetch()} />
      </Screen>
    );
  return (
    <Screen edges={['bottom']} className='px-0'>
      <FlatList
        data={history.isPending ? [] : entries}
        keyExtractor={(entry) => `${entry.match.id}-${entry.teamIndex}`}
        contentContainerClassName='gap-3 px-5 pb-8'
        ListHeaderComponent={header}
        refreshing={history.isRefetching && !history.isFetchingNextPage}
        onRefresh={() => {
          void history.refetch();
          void summary.refetch();
        }}
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
          ) : (
            <EmptyState
              icon={<Trophy size={28} color={brand} />}
              title={
                search.sportId
                  ? 'Nada nesta modalidade ainda'
                  : 'Nenhuma partida registrada ainda'
              }
              description={
                search.sportId
                  ? 'Toque na modalidade de novo para ver todas.'
                  : mine
                    ? 'Quando um placar for registrado, a partida entra aqui com o resultado e a variação do rating.'
                    : 'Este jogador ainda não tem partidas públicas com placar.'
              }
            />
          )
        }
        renderItem={({ item }) => (
          <HistoryEntryCard entry={item} showRating={mine} />
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
    </Screen>
  );
}
