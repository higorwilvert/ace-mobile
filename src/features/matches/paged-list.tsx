import {
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { ErrorState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import palette from '@/config/palette.json';

import type { Page } from './api';
import { MatchCardSkeleton } from './match-card';

export type Item<T> = { id: string; node: ReactNode; data: T };
/** Lista paginada com esqueleto, erro, vazio, pull-to-refresh e "carregar mais". */
export function PagedList<T>({
  query,
  items,
  empty,
  header,
}: {
  query: UseInfiniteQueryResult<InfiniteData<Page<T>>, Error>;
  items: Item<T>[];
  empty: ReactNode;
  header: ReactNode;
}) {
  const brand = palette.colors.brand;
  if (query.isError)
    return (
      <View className='flex-1'>
        <View className='px-5'>{header}</View>
        <ErrorState error={query.error} retry={() => query.refetch()} />
      </View>
    );
  return (
    <FlatList
      data={query.isPending ? [] : items}
      keyExtractor={(item) => item.id}
      contentContainerClassName='gap-3 px-5 pb-28'
      ListHeaderComponent={<>{header}</>}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => void query.refetch()}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage)
          void query.fetchNextPage();
      }}
      ListEmptyComponent={
        query.isPending ? (
          <View className='gap-3' accessible accessibilityRole='progressbar'>
            <MatchCardSkeleton />
            <MatchCardSkeleton />
          </View>
        ) : (
          <>{empty}</>
        )
      }
      renderItem={({ item }) => <>{item.node}</>}
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <ActivityIndicator color={brand} className='py-4' />
        ) : query.hasNextPage ? (
          <Button
            variant='secondary'
            label='Carregar mais'
            onPress={() => void query.fetchNextPage()}
          />
        ) : null
      }
    />
  );
}
