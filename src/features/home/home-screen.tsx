import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  CalendarClock,
  ChevronRight,
  CircleDot,
  Mail,
  Sparkles,
  TrendingUp,
  Trophy,
  UserPlus,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Logo } from '@/components/ace/logo';
import { SportIcon } from '@/components/ace/sport-icon';
import { EmptyState, ErrorState, LoadingState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { useSession } from '@/features/auth/session';
import { myMatchesQuery } from '@/features/matches/api';
import { StatusBadge } from '@/features/matches/match-card';
import { formatWhen, matchTitle } from '@/features/matches/schemas';
import { playerProfileQuery, profilesQuery } from '@/features/players/api';
import { profileDetails } from '@/features/players/sports-screen';
import { ratingNumber } from '@/features/results/schemas';
import { useInboxCount } from '@/hooks/use-inbox-count';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { firstName } from '@/lib/utils';

/** As três próximas partidas em que o jogador está (abertas ou confirmadas). */
function UpcomingMatches() {
  const router = useRouter();
  const matches = useInfiniteQuery(myMatchesQuery({}));
  useRefetchOnFocus(matches.refetch);
  // Instante fixado na montagem: o filtro não precisa mudar a cada render.
  const [now] = useState(() => Date.now());
  const upcoming = (matches.data?.pages[0]?.data ?? [])
    .filter(
      (m) =>
        (m.status === 'OPEN' || m.status === 'CONFIRMED') &&
        new Date(m.scheduledAt).getTime() > now,
    )
    .slice(0, 3);
  return (
    <View className='gap-3 rounded-panel border border-border bg-card p-4'>
      <View className='flex-row items-center justify-between'>
        <Text variant='subtitle'>Próximas partidas</Text>
        <Pressable
          accessibilityRole='link'
          hitSlop={8}
          onPress={() => router.push('/mine')}
        >
          <Text className='font-inter-medium text-sm text-brand'>
            Ver todas
          </Text>
        </Pressable>
      </View>
      {matches.isPending ? (
        <ActivityIndicator color={palette.colors.brand} />
      ) : matches.isError ? (
        <Text variant='muted'>Não foi possível carregar sua agenda.</Text>
      ) : upcoming.length === 0 ? (
        <Pressable
          accessibilityRole='button'
          className='flex-row items-center gap-3 rounded-card bg-brand-muted p-3 active:opacity-80'
          onPress={() => router.push('/matches')}
        >
          <CircleDot size={20} color={palette.colors.brand} />
          <Text variant='muted' className='flex-1'>
            Nenhuma partida marcada. Explore as partidas abertas na sua cidade.
          </Text>
          <ChevronRight size={18} color={palette.colors.brand} />
        </Pressable>
      ) : (
        upcoming.map((m) => (
          <Pressable
            key={m.id}
            accessibilityRole='button'
            accessibilityLabel={matchTitle(m)}
            className='flex-row items-center gap-3 active:opacity-80'
            onPress={() => router.push(`/matches/${m.id}`)}
          >
            <SportIcon slug={m.sport.slug} size={40} />
            <View className='flex-1 gap-0.5'>
              <Text variant='label' numberOfLines={1}>
                {matchTitle(m)}
              </Text>
              <Text variant='muted'>{formatWhen(m.scheduledAt)}</Text>
            </View>
            <StatusBadge status={m.status} scheduledAt={m.scheduledAt} />
          </Pressable>
        ))
      )}
    </View>
  );
}

/** Convites recebidos aguardando resposta: só aparece quando há algum. */
function PendingInvites() {
  const router = useRouter();
  const { invites: count } = useInboxCount();
  if (count === 0) return null;
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel='Ver convites pendentes'
      className='flex-row items-center gap-3 rounded-panel border border-brand bg-brand-muted p-4 active:opacity-80'
      onPress={() => router.push('/mine?view=invites&box=received')}
    >
      <View className='h-11 w-11 items-center justify-center rounded-card bg-brand'>
        <Mail size={22} color='#fff' />
      </View>
      <View className='flex-1 gap-0.5'>
        <Text variant='label'>
          {count === 1
            ? 'Você tem 1 convite aguardando resposta'
            : `Você tem ${count} convites aguardando resposta`}
        </Text>
        <Text variant='muted'>Alguém chamou você para jogar.</Text>
      </View>
      <ChevronRight size={18} color={palette.colors.brand} />
    </Pressable>
  );
}

/** Pedidos de amizade aguardando resposta (T33): só aparece quando há algum. */
function PendingFriendRequests() {
  const router = useRouter();
  const { friendRequests: count } = useInboxCount();
  if (count === 0) return null;
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel='Ver pedidos de amizade'
      className='flex-row items-center gap-3 rounded-panel border border-brand bg-brand-muted p-4 active:opacity-80'
      onPress={() => router.push('/players?view=requests')}
    >
      <View className='h-11 w-11 items-center justify-center rounded-card bg-brand'>
        <UserPlus size={22} color='#fff' />
      </View>
      <View className='flex-1 gap-0.5'>
        <Text variant='label'>
          {count === 1
            ? 'Você tem 1 pedido de amizade'
            : `Você tem ${count} pedidos de amizade`}
        </Text>
        <Text variant='muted'>Alguém quer entrar na sua rede.</Text>
      </View>
      <ChevronRight size={18} color={palette.colors.brand} />
    </Pressable>
  );
}

export function HomeScreen() {
  const { user } = useSession();
  const router = useRouter();
  const profiles = useQuery(profilesQuery);
  // Sem principal marcado (dado legado), o primeiro da lista representa.
  const main =
    profiles.data?.find((profile) => profile.isPrincipal) ?? profiles.data?.[0];
  // Rating do esporte principal (T32): o perfil próprio não traz `rating`, o
  // público (`/users/:id/profile`) traz — e é a consulta que o placar invalida.
  const player = useQuery({
    ...playerProfileQuery(user?.id ?? ''),
    enabled: Boolean(user),
  });
  const rating = main
    ? (player.data?.sportProfiles.find((p) => p.sportId === main.sportId)
        ?.rating ?? null)
    : null;
  return (
    <Screen scroll edges={['top']} className='gap-6 pt-4'>
      <Logo width={72} />
      <View className='gap-1'>
        <Text variant='title'>
          {`Olá, ${user ? firstName(user.fullName) : 'jogador'}.`}
        </Text>
        {user && <Text variant='muted'>{`${user.city} · ${user.state}`}</Text>}
      </View>
      <PendingInvites />
      <PendingFriendRequests />
      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Para você'
        className='flex-row items-center gap-3 rounded-panel border border-border bg-card p-4 active:bg-brand-muted'
        onPress={() => router.push('/for-you')}
      >
        <View className='h-11 w-11 items-center justify-center rounded-card bg-brand'>
          <Sparkles size={22} color='#ffffff' />
        </View>
        <View className='flex-1 gap-0.5'>
          <Text variant='label'>Jogadores e partidas para você</Text>
          <Text variant='muted'>Sugestões no seu nível, na sua região.</Text>
        </View>
        <ChevronRight size={18} color={palette.colors.brand} />
      </Pressable>
      {profiles.isPending ? (
        <LoadingState label='Carregando seu perfil…' />
      ) : profiles.isError ? (
        <ErrorState error={profiles.error} retry={() => profiles.refetch()} />
      ) : main ? (
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Seu esporte principal'
          className='gap-3 rounded-panel border border-border bg-card p-4 active:bg-brand-muted'
          onPress={() => router.push('/sports')}
        >
          <Text variant='muted'>Seu esporte principal</Text>
          <View className='flex-row items-center gap-3'>
            <SportIcon slug={main.sport.slug} size={52} />
            <View className='flex-1 gap-0.5'>
              <Text variant='subtitle'>{main.sport.name}</Text>
              <Text variant='muted'>
                {profileDetails(main).join(' · ') || 'Complete seu perfil'}
              </Text>
              {rating && (
                <View className='flex-row items-center gap-1 pt-0.5'>
                  <TrendingUp size={14} color={palette.colors.brand} />
                  <Text className='font-inter-semibold text-sm text-brand'>
                    {`Rating ACE ${ratingNumber(rating.rating)}`}
                  </Text>
                  <Text variant='muted'>
                    {rating.matchesPlayed === 0
                      ? '· estimativa inicial'
                      : `· ${rating.matchesPlayed} ${rating.matchesPlayed === 1 ? 'partida' : 'partidas'}`}
                  </Text>
                </View>
              )}
            </View>
            <ChevronRight
              size={18}
              color={palette.colors['muted-foreground']}
            />
          </View>
        </Pressable>
      ) : (
        <EmptyState
          icon={<Trophy size={28} color={palette.colors.brand} />}
          title='Comece pelo seu perfil esportivo'
          description='Escolha sua modalidade e categoria para ter rating e receber recomendações.'
        >
          <Button
            variant='secondary'
            label='Adicionar modalidade'
            onPress={() => router.push('/sports')}
          />
        </EmptyState>
      )}
      <UpcomingMatches />
      <Pressable
        accessibilityRole='button'
        className='flex-row items-center gap-3 rounded-panel border border-border bg-card p-4 active:bg-brand-muted'
        onPress={() => router.push('/availability')}
      >
        <View className='h-11 w-11 items-center justify-center rounded-card bg-brand-muted'>
          <CalendarClock size={22} color={palette.colors.brand} />
        </View>
        <View className='flex-1 gap-0.5'>
          <Text variant='label'>Disponibilidade</Text>
          <Text variant='muted'>Quando você costuma jogar na semana.</Text>
        </View>
        <ChevronRight size={18} color={palette.colors['muted-foreground']} />
      </Pressable>
    </Screen>
  );
}
