import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CircleDot,
  LocateFixed,
  Plus,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SportIcon } from '@/components/ace/sport-icon';
import { EmptyState, ErrorState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Chip, Chips } from '@/components/ui/chips';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { useSession } from '@/features/auth/session';
import { profilesQuery, sportsQuery } from '@/features/players/api';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';

import { searchMatchesQuery } from './api';
import { MatchCard, MatchCardSkeleton } from './match-card';
import { MatchFiltersSheet } from './match-filters-sheet';
import {
  activeFilterCount,
  matchesSearchSchema,
  type MatchesSearch,
} from './schemas';

const keys = [
  'sportId',
  'teamSize',
  'state',
  'city',
  'categoryCode',
  'genderPolicy',
  'dateFrom',
  'dateTo',
] as const;
/** Busca → params: toda chave vai explícita ('' limpa), porque `setParams` mescla. */
const toParams = (search: MatchesSearch) =>
  Object.fromEntries(
    keys.map((key) => [
      key,
      search[key] === undefined ? '' : String(search[key]),
    ]),
  ) as Record<(typeof keys)[number], string>;

// Primeira visita sem filtros começa perto do jogador; depois os params mandam.
let located = false;
/** @internal só para testes */
export const resetLocated = () => {
  located = false;
};

/** Filtros do Explorar vivem nos query params da aba (voltar do detalhe preserva). */
export function useMatchesSearch() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const router = useRouter();
  const search = useMemo(() => matchesSearchSchema.parse(params), [params]);
  const setSearch = (next: MatchesSearch) => router.setParams(toParams(next));
  return { search, setSearch };
}

export function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { search, setSearch } = useMatchesSearch();
  const sports = useQuery(sportsQuery);
  const profiles = useQuery(profilesQuery);
  const matches = useInfiniteQuery(searchMatchesQuery(search));
  const [filtersOpen, setFiltersOpen] = useState(false);
  useRefetchOnFocus(matches.refetch);

  const count = activeFilterCount(search);
  useEffect(() => {
    if (located || count > 0 || !user) return;
    located = true;
    setSearch({ state: user.state, city: user.city });
  }, [count, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = matches.data?.pages.flatMap((page) => page.data) ?? [];
  const selectedSport = sports.data?.find((s) => s.id === search.sportId);
  const myCategory = profiles.data?.find(
    (p) => p.sportId === search.sportId,
  )?.categoryCode;
  const nearMe =
    !!user && search.state === user.state && search.city === user.city;
  const brand = palette.colors.brand;

  const header = (
    <View className='gap-4 pb-4 pt-2'>
      <View className='gap-1'>
        <Text className='font-inter-semibold text-xs uppercase tracking-widest text-brand'>
          Encontre seu próximo jogo
        </Text>
        <Text variant='title'>
          Partidas<Text className='font-inter-bold text-2xl text-brand'>.</Text>
        </Text>
        <Text variant='muted'>
          Partidas públicas abertas, prontas para receber você.
        </Text>
      </View>
      <Chips
        label='Modalidade'
        value={search.sportId ? String(search.sportId) : 'all'}
        clearable={false}
        onChange={(value) =>
          setSearch({
            ...search,
            sportId: value && value !== 'all' ? Number(value) : undefined,
            categoryCode: undefined,
          })
        }
        options={[
          { value: 'all', label: 'Todas' },
          ...(sports.data ?? []).map((sport) => ({
            value: String(sport.id),
            label: sport.name,
            icon: <SportIcon slug={sport.slug} size={18} />,
          })),
        ]}
      />
      <View className='flex-row flex-wrap gap-2'>
        <Chip
          label={count ? `Filtros (${count})` : 'Filtros'}
          icon={<SlidersHorizontal size={14} color={brand} />}
          onPress={() => setFiltersOpen(true)}
        />
        {user && (
          <Chip
            label='Perto de mim'
            active={nearMe}
            icon={<LocateFixed size={14} color={nearMe ? '#fff' : brand} />}
            onPress={() =>
              setSearch(
                nearMe
                  ? { ...search, state: undefined, city: undefined }
                  : { ...search, state: user.state, city: user.city },
              )
            }
          />
        )}
        {myCategory && (
          <Chip
            label='Minha categoria'
            active={search.categoryCode === myCategory}
            icon={
              <Sparkles
                size={14}
                color={search.categoryCode === myCategory ? '#fff' : brand}
              />
            }
            onPress={() =>
              setSearch({
                ...search,
                categoryCode:
                  search.categoryCode === myCategory ? undefined : myCategory,
              })
            }
          />
        )}
        {count > 0 && (
          <Chip
            label='Limpar'
            icon={<X size={14} color={brand} />}
            onPress={() => setSearch({})}
          />
        )}
      </View>
      {!matches.isPending && !matches.isError && items.length > 0 && (
        <Text variant='muted' accessibilityRole='text'>
          {`${items.length} ${items.length === 1 ? 'partida' : 'partidas'}${matches.hasNextPage ? ' carregadas' : ''}`}
        </Text>
      )}
    </View>
  );

  return (
    <Screen edges={['top']} className='px-0'>
      {matches.isError ? (
        <View className='flex-1'>
          <View className='px-5'>{header}</View>
          <ErrorState error={matches.error} retry={() => matches.refetch()} />
        </View>
      ) : (
        <FlatList
          data={matches.isPending ? [] : items}
          keyExtractor={(item) => item.id}
          contentContainerClassName='gap-3 px-5 pb-28'
          ListHeaderComponent={header}
          refreshing={matches.isRefetching && !matches.isFetchingNextPage}
          onRefresh={() => void matches.refetch()}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (matches.hasNextPage && !matches.isFetchingNextPage)
              void matches.fetchNextPage();
          }}
          ListEmptyComponent={
            matches.isPending ? (
              <View
                className='gap-3'
                accessible
                accessibilityRole='progressbar'
              >
                <MatchCardSkeleton />
                <MatchCardSkeleton />
                <MatchCardSkeleton />
              </View>
            ) : (
              <EmptyState
                icon={<CircleDot size={28} color={brand} />}
                title={
                  count
                    ? 'Nenhuma partida com esses filtros'
                    : 'Nenhuma partida aberta por enquanto'
                }
                description={
                  count
                    ? 'Amplie a busca ou crie a partida que você quer jogar.'
                    : 'Seja quem dá o primeiro saque: crie uma partida e receba candidaturas.'
                }
              >
                <View className='w-full gap-2 pt-2'>
                  {count > 0 && (
                    <Button
                      variant='secondary'
                      label='Limpar filtros'
                      onPress={() => setSearch({})}
                    />
                  )}
                  <Button
                    label='Criar partida'
                    onPress={() => router.push('/matches/new')}
                  />
                </View>
              </EmptyState>
            )
          }
          renderItem={({ item }) => (
            <MatchCard
              match={item}
              onPress={() => router.push(`/matches/${item.id}`)}
            />
          )}
          ListFooterComponent={
            matches.isFetchingNextPage ? (
              <ActivityIndicator color={brand} className='py-4' />
            ) : matches.hasNextPage ? (
              <Button
                variant='secondary'
                label='Carregar mais'
                onPress={() => void matches.fetchNextPage()}
              />
            ) : null
          }
        />
      )}
      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Criar partida'
        onPress={() => router.push('/matches/new')}
        className='absolute right-5 h-14 flex-row items-center gap-2 rounded-pill bg-brand pl-4 pr-5 active:bg-brand-hover'
        style={{
          bottom: 20 + insets.bottom / 2,
          shadowColor: palette.colors.navy,
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        <Plus size={20} color='#fff' strokeWidth={2.5} />
        <Text className='font-inter-semibold text-base text-white'>
          Criar partida
        </Text>
      </Pressable>
      <MatchFiltersSheet
        visible={filtersOpen}
        search={search}
        sport={selectedSport}
        onApply={(next) => setSearch({ ...next, sportId: search.sportId })}
        onClose={() => setFiltersOpen(false)}
      />
    </Screen>
  );
}
