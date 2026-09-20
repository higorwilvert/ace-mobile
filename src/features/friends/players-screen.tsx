import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Inbox, Search, Send, UserPlus, Users, X } from 'lucide-react-native';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { SportIcon } from '@/components/ace/sport-icon';
import { EmptyState, ErrorState, LoadingState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import palette from '@/config/palette.json';
import { PagedList } from '@/features/matches/paged-list';
import { searchPlayersQuery, sportsQuery } from '@/features/players/api';
import { useDebounce } from '@/hooks/use-debounce';
import { useInboxCount } from '@/hooks/use-inbox-count';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { cn } from '@/lib/utils';

import { friendRequestsQuery, friendsQuery } from './api';
import { PlayerRow } from './player-row';
import { RelationshipButton } from './relationship-button';
import {
  friendAction,
  type PlayersSearch,
  playersSearchSchema,
  playersViewLabels,
  playersViews,
  requestBoxLabels,
  requestBoxes,
  requestDateLabel,
  sinceLabel,
} from './schemas';

/** `view`/`q`/`sportId`/`box` vivem nos params da tela, como os filtros de Minhas. */
function usePlayersSearch() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const router = useRouter();
  const search = useMemo(() => playersSearchSchema.parse(params), [params]);
  const go = (patch: Partial<PlayersSearch>) => {
    const next = { ...search, ...patch };
    router.setParams({
      view: next.view,
      q: next.q,
      sportId: next.sportId ? String(next.sportId) : '',
      box: next.box,
    });
  };
  return { search, go };
}

type ViewProps = {
  search: PlayersSearch;
  go: (patch: Partial<PlayersSearch>) => void;
  header: ReactNode;
};

const ALL = 'all';
const brand = palette.colors.brand;
const muted = palette.colors['muted-foreground'];
/** Linha que some com fade quando a ação a tira da lista (aceitar, cancelar, desfazer). */
const Row = ({ children }: { children: ReactNode }) => (
  <Animated.View exiting={FadeOut.duration(180)} layout={LinearTransition}>
    {children}
  </Animated.View>
);

function SearchView({ search, go, header }: ViewProps) {
  const [term, setTerm] = useState(search.q);
  const debounced = useDebounce(term.trim(), 300);
  // O termo vai para os params só depois do debounce: deep link e a volta do
  // perfil preservam a busca sem gravar a cada tecla.
  useEffect(() => {
    if (debounced !== search.q) go({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  const sports = useQuery(sportsQuery);
  const query = searchPlayersQuery(search.q, search.sportId);
  const results = useQuery(query);
  const controls = (
    <View className='gap-3'>
      {header}
      <View className='flex-row items-end gap-2'>
        <View className='flex-1'>
          <TextField
            label='Nome do jogador'
            placeholder='Buscar pelo nome…'
            value={term}
            onChangeText={setTerm}
            autoCorrect={false}
            autoCapitalize='words'
            returnKeyType='search'
            maxLength={100}
          />
        </View>
        {term.length > 0 && (
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Limpar busca'
            hitSlop={8}
            className='h-12 w-12 items-center justify-center rounded-control border border-border bg-card active:bg-brand-muted'
            onPress={() => setTerm('')}
          >
            <X size={18} color={muted} />
          </Pressable>
        )}
      </View>
      {sports.data && (
        <Chips
          label='Modalidade'
          clearable={false}
          options={[
            { value: ALL, label: 'Todas' },
            ...sports.data.map((sport) => ({
              value: String(sport.id),
              label: sport.name,
              icon: <SportIcon slug={sport.slug} size={18} />,
            })),
          ]}
          value={search.sportId ? String(search.sportId) : ALL}
          onChange={(value) =>
            go({ sportId: value && value !== ALL ? Number(value) : undefined })
          }
        />
      )}
      <View className='h-1' />
    </View>
  );
  const empty = !query.enabled ? (
    <EmptyState
      icon={<UserPlus size={28} color={brand} />}
      title='Encontre quem joga com você'
      description='Digite ao menos duas letras do nome. Perfis privados aparecem, mas mostram só o essencial.'
    />
  ) : results.isPending ? (
    <LoadingState label='Procurando jogadores…' />
  ) : results.isError ? (
    <ErrorState error={results.error} retry={() => void results.refetch()} />
  ) : (
    <EmptyState
      icon={<Search size={28} color={brand} />}
      title='Ninguém com esse nome por aqui'
      description='Confira a grafia ou tente só o primeiro nome. O filtro de modalidade também restringe a busca.'
    />
  );
  return (
    <FlatList
      data={query.enabled && results.data ? results.data : []}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps='handled'
      contentContainerClassName='gap-3 px-5 pb-8'
      ListHeaderComponent={controls}
      ListEmptyComponent={empty}
      renderItem={({ item }) => (
        <PlayerRow
          user={item}
          sports={item.sports}
          isPrivate={item.profileVisibility === 'PRIVATE'}
        >
          {item.relationship.status === 'SELF' ? (
            // A busca não exclui quem busca: marca em vez de deixar a linha sem ação.
            <Text variant='muted' className='px-1'>
              {friendAction(item.relationship).label}
            </Text>
          ) : (
            <RelationshipButton
              userId={item.id}
              name={item.fullName}
              relationship={item.relationship}
              size='sm'
            />
          )}
        </PlayerRow>
      )}
    />
  );
}

function FriendsView({ go, header }: ViewProps) {
  const friends = useInfiniteQuery(friendsQuery('me'));
  useRefetchOnFocus(friends.refetch);
  const items = friends.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <PagedList
      query={friends}
      header={
        <View className='gap-3'>
          {header}
          <View className='h-1' />
        </View>
      }
      empty={
        <EmptyState
          icon={<Users size={28} color={brand} />}
          title='Sua rede começa aqui'
          description='Adicione jogadores que você conhece para achá-los rápido na hora de convidar.'
        >
          <View className='w-full pt-2'>
            <Button
              label='Buscar jogadores'
              icon={<Search size={16} color='#fff' />}
              onPress={() => go({ view: 'search' })}
            />
          </View>
        </EmptyState>
      }
      items={items.map((friend) => ({
        id: friend.user.id,
        data: friend,
        node: (
          <Row>
            <PlayerRow user={friend.user} meta={sinceLabel(friend.since)}>
              <RelationshipButton
                userId={friend.user.id}
                name={friend.user.fullName}
                relationship={{
                  status: 'FRIENDS',
                  requestId: null,
                  since: friend.since,
                }}
                size='sm'
              />
            </PlayerRow>
          </Row>
        ),
      }))}
    />
  );
}

function RequestsView({ search, go, header }: ViewProps) {
  const requests = useInfiniteQuery(friendRequestsQuery(search.box));
  useRefetchOnFocus(requests.refetch);
  const items = requests.data?.pages.flatMap((page) => page.data) ?? [];
  const received = search.box === 'received';
  return (
    <PagedList
      query={requests}
      header={
        <View className='gap-3'>
          {header}
          <Chips
            label='Caixa'
            clearable={false}
            options={requestBoxes.map((value) => ({
              value,
              label: requestBoxLabels[value],
            }))}
            value={search.box}
            onChange={(box) => go({ box: box ?? 'received' })}
          />
          <View className='h-1' />
        </View>
      }
      empty={
        received ? (
          <EmptyState
            icon={<Inbox size={28} color={brand} />}
            title='Nenhum pedido esperando você'
            description='Quando alguém pedir sua amizade, o pedido aparece aqui.'
          />
        ) : (
          <EmptyState
            icon={<Send size={28} color={brand} />}
            title='Nenhum pedido aguardando resposta'
            description='Os pedidos que você enviar ficam aqui até serem respondidos.'
          />
        )
      }
      items={items.map((request) => {
        // Recebido: quem pediu; enviado: para quem pedi.
        const other = received ? request.requester : request.addressee;
        return {
          id: request.id,
          data: request,
          node: (
            <Row>
              <PlayerRow
                user={other}
                meta={requestDateLabel(search.box, request.createdAt)}
              >
                <RelationshipButton
                  userId={other.id}
                  name={other.fullName}
                  relationship={{
                    status: received ? 'REQUEST_RECEIVED' : 'REQUEST_SENT',
                    requestId: request.id,
                    since: null,
                  }}
                  size='sm'
                />
              </PlayerRow>
            </Row>
          ),
        };
      })}
    />
  );
}

/** `/players`: Buscar · Amigos · Pedidos, com o contador de pedidos no segmento. */
export function PlayersScreen() {
  const { search, go } = usePlayersSearch();
  const inbox = useInboxCount();
  const pending = inbox.label(inbox.friendRequests);
  const header = (
    <View className='gap-4 pb-1 pt-4'>
      <View className='gap-1'>
        <Text className='font-inter-semibold text-xs uppercase tracking-widest text-brand'>
          Sua rede em quadra
        </Text>
        <Text variant='title'>
          Jogadores
          <Text className='font-inter-bold text-2xl text-brand'>.</Text>
        </Text>
        <Text variant='muted'>
          Encontre quem joga perto de você, adicione amigos e convide para a
          próxima partida.
        </Text>
      </View>
      <View
        className='flex-row rounded-control border border-border bg-card p-1'
        accessibilityRole='tablist'
      >
        {playersViews.map((view) => {
          const active = search.view === view;
          const badge = view === 'requests' ? pending : undefined;
          return (
            <Pressable
              key={view}
              accessibilityRole='tab'
              accessibilityState={{ selected: active }}
              accessibilityLabel={
                badge
                  ? `${playersViewLabels[view]}, ${badge} pendentes`
                  : playersViewLabels[view]
              }
              onPress={() => go({ view, box: 'received' })}
              className={cn(
                'flex-1 flex-row items-center justify-center gap-1.5 rounded-tiny py-2',
                active && 'bg-brand',
              )}
            >
              <Text
                className={cn(
                  'font-inter-semibold text-sm',
                  active ? 'text-white' : 'text-foreground',
                )}
              >
                {playersViewLabels[view]}
              </Text>
              {badge && (
                <View
                  className={cn(
                    'min-w-5 items-center rounded-pill px-1.5',
                    active ? 'bg-white' : 'bg-brand',
                  )}
                >
                  <Text
                    className={cn(
                      'font-inter-semibold text-xs',
                      active ? 'text-brand' : 'text-white',
                    )}
                  >
                    {badge}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
  // `key` por vista: trocar de segmento remonta a lista (e zera o termo).
  return (
    <Screen edges={['bottom']} className='px-0'>
      {search.view === 'friends' ? (
        <FriendsView key='friends' search={search} go={go} header={header} />
      ) : search.view === 'requests' ? (
        <RequestsView key='requests' search={search} go={go} header={header} />
      ) : (
        <SearchView key='search' search={search} go={go} header={header} />
      )}
    </Screen>
  );
}
