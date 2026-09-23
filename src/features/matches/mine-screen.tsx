import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CircleDot,
  Inbox,
  Plus,
  Send,
  SlidersHorizontal,
} from 'lucide-react-native';
import { type ReactNode, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { ActiveFilterChips, Chip } from '@/components/ui/chips';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { MyInvitesView } from '@/features/invites/invites-view';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { cn } from '@/lib/utils';

import {
  type MatchStatus,
  myApplicationsQuery,
  myMatchesQuery,
  type ParticipantStatus,
  publishMatch,
  withdrawApplication,
} from './api';
import { MatchCard, ParticipationBadge } from './match-card';
import { MineFiltersSheet } from './mine-filters-sheet';
import { PagedList } from './paged-list';
import {
  matchStatusLabels,
  type MineSearch,
  mineActiveFilters,
  mineSearchSchema,
} from './schemas';
import { useMatchMutation } from './use-match-mutation';

/** `view`/`role`/`box`/`status` vivem nos params da aba, como os filtros do Explorar. */
function useMineSearch() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const router = useRouter();
  const search = useMemo(() => mineSearchSchema.parse(params), [params]);
  const go = (patch: Partial<MineSearch>) => {
    const next = { ...search, ...patch };
    router.setParams({
      view: next.view,
      role: next.role,
      box: next.box,
      status: next.status ?? '',
    });
  };
  return { search, go };
}

function MyMatchesView({
  search,
  go,
  header,
}: {
  search: MineSearch;
  go: (patch: Partial<MineSearch>) => void;
  header: ReactNode;
}) {
  const router = useRouter();
  const status = search.status as MatchStatus | undefined;
  const matches = useInfiniteQuery(
    myMatchesQuery({ role: search.role, status }),
  );
  useRefetchOnFocus(matches.refetch);
  const publish = useMatchMutation((id: string) => publishMatch(id), {
    success: 'Partida publicada. Ela já aparece em Partidas.',
  });
  const items = matches.data?.pages.flatMap((page) => page.data) ?? [];
  const brand = palette.colors.brand;
  return (
    <PagedList
      query={matches}
      header={header}
      empty={
        <EmptyState
          icon={<CircleDot size={28} color={brand} />}
          title={
            search.role === 'creator'
              ? 'Você ainda não organizou partidas'
              : search.role === 'participant'
                ? 'Você ainda não entrou em partidas'
                : 'Sua agenda está livre'
          }
          description={
            status
              ? `Nenhuma partida ${matchStatusLabels[status].toLowerCase()} por aqui.`
              : 'Explore partidas abertas na sua cidade ou crie a sua.'
          }
        >
          <View className='w-full gap-2 pt-2'>
            {mineActiveFilters(search).length > 0 && (
              <Button
                variant='secondary'
                label='Limpar filtros'
                onPress={() =>
                  go({ role: 'all', box: 'received', status: undefined })
                }
              />
            )}
            <Button
              variant='secondary'
              label='Explorar partidas'
              onPress={() => router.push('/matches')}
            />
            <Button
              label='Criar partida'
              onPress={() => router.push('/matches/new')}
            />
          </View>
        </EmptyState>
      }
      items={items.map((match) => ({
        id: match.id,
        data: match,
        node: (
          <MatchCard
            match={match}
            showStatus
            onPress={() => router.push(`/matches/${match.id}`)}
          >
            {match.status === 'DRAFT' && (
              <Button
                label='Publicar'
                className='h-10 px-3'
                busy={publish.isPending && publish.variables === match.id}
                disabled={publish.isPending}
                icon={<Send size={15} color='#fff' />}
                onPress={() => publish.mutate(match.id)}
              />
            )}
          </MatchCard>
        ),
      }))}
    />
  );
}

function MyApplicationsView({
  search,
  go,
  header,
}: {
  search: MineSearch;
  go: (patch: Partial<MineSearch>) => void;
  header: ReactNode;
}) {
  const router = useRouter();
  const status = search.status as ParticipantStatus | undefined;
  const applications = useInfiniteQuery(myApplicationsQuery(status));
  useRefetchOnFocus(applications.refetch);
  const withdraw = useMatchMutation(
    (matchId: string) => withdrawApplication(matchId),
    { success: 'Candidatura retirada.' },
  );
  const confirmWithdraw = (matchId: string) =>
    Alert.alert(
      'Retirar candidatura?',
      'Você sai da fila desta partida. Se mudar de ideia, pode se candidatar de novo enquanto houver vaga.',
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Retirar',
          style: 'destructive',
          onPress: () => withdraw.mutate(matchId),
        },
      ],
    );
  const items = applications.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <PagedList
      query={applications}
      header={header}
      empty={
        <EmptyState
          icon={<Inbox size={28} color={palette.colors.brand} />}
          title='Nenhuma candidatura por aqui'
          description='Quando você pedir para entrar numa partida, ela aparece nesta lista com a resposta do criador.'
        >
          <View className='w-full gap-2 pt-2'>
            {mineActiveFilters(search).length > 0 && (
              <Button
                variant='secondary'
                label='Limpar filtros'
                onPress={() =>
                  go({ role: 'all', box: 'received', status: undefined })
                }
              />
            )}
            <Button
              label='Explorar partidas abertas'
              onPress={() => router.push('/matches')}
            />
          </View>
        </EmptyState>
      }
      items={items.map((item) => ({
        id: item.id,
        data: item,
        node: (
          <MatchCard
            match={item.match}
            showStatus
            onPress={() => router.push(`/matches/${item.match.id}`)}
          >
            <ParticipationBadge status={item.status} />
            {item.teamIndex && item.status === 'CONFIRMED' && (
              <Text variant='muted'>{`Time ${item.teamIndex}`}</Text>
            )}
            {item.status === 'PENDING' && (
              <Button
                variant='secondary'
                label='Retirar candidatura'
                className='h-10 px-3'
                disabled={withdraw.isPending}
                onPress={() => confirmWithdraw(item.match.id)}
              />
            )}
          </MatchCard>
        ),
      }))}
    />
  );
}

export function MineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { search, go } = useMineSearch();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = mineActiveFilters(search);
  const applications = search.view === 'applications';
  const invites = search.view === 'invites';
  const copy = invites
    ? {
        title: 'Convites',
        text: 'Quem chamou você para jogar e quem você chamou.',
      }
    : applications
      ? {
          title: 'Candidaturas',
          text: 'As partidas em que você pediu para entrar e a resposta de cada criador.',
        }
      : {
          title: 'Minhas partidas',
          text: 'Tudo o que você organiza ou joga, inclusive rascunhos e partidas privadas.',
        };
  const header = (
    <View className='gap-4 pb-1 pt-2'>
      <View className='gap-1'>
        <Text className='font-inter-semibold text-xs uppercase tracking-widest text-brand'>
          Seu jogo, sua agenda
        </Text>
        <Text variant='title'>
          {copy.title}
          <Text className='font-inter-bold text-2xl text-brand'>.</Text>
        </Text>
        <Text variant='muted'>{copy.text}</Text>
      </View>
      <View
        className='flex-row rounded-control border border-border bg-card p-1'
        accessibilityRole='tablist'
      >
        {(
          [
            ['matches', 'Partidas'],
            ['applications', 'Candidaturas'],
            ['invites', 'Convites'],
          ] as const
        ).map(([view, label]) => {
          const active = search.view === view;
          return (
            <Pressable
              key={view}
              accessibilityRole='tab'
              accessibilityState={{ selected: active }}
              onPress={() =>
                go({ view, role: 'all', box: 'received', status: undefined })
              }
              className={cn(
                'flex-1 items-center rounded-tiny py-2',
                active && 'bg-brand',
              )}
            >
              <Text
                className={cn(
                  'font-inter-semibold text-sm',
                  active ? 'text-white' : 'text-foreground',
                )}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View className='gap-2'>
        <View className='flex-row flex-wrap gap-2'>
          <Chip
            label={
              activeFilters.length
                ? `Filtrar (${activeFilters.length})`
                : 'Filtrar'
            }
            icon={<SlidersHorizontal size={14} color={palette.colors.brand} />}
            onPress={() => setFiltersOpen(true)}
          />
        </View>
        <ActiveFilterChips
          chips={activeFilters.map((chip) => ({
            key: chip.key,
            label: chip.label,
            onRemove: () => go(chip.clear),
          }))}
          onClear={() =>
            go({ role: 'all', box: 'received', status: undefined })
          }
        />
      </View>
    </View>
  );
  return (
    <Screen edges={['top']} className='px-0'>
      {invites ? (
        <MyInvitesView key='invites' search={search} header={header} />
      ) : applications ? (
        <MyApplicationsView
          key='applications'
          search={search}
          go={go}
          header={header}
        />
      ) : (
        <MyMatchesView key='matches' search={search} go={go} header={header} />
      )}
      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Criar partida'
        onPress={() => router.push('/matches/new')}
        className='absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-brand active:bg-brand-hover'
        style={{
          bottom: 20 + insets.bottom / 2,
          shadowColor: palette.colors.navy,
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        <Plus size={24} color='#fff' strokeWidth={2.5} />
      </Pressable>
      <MineFiltersSheet
        visible={filtersOpen}
        search={search}
        onApply={go}
        onClose={() => setFiltersOpen(false)}
      />
    </Screen>
  );
}
