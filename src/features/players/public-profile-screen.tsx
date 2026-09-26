import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronRight,
  Hand,
  Lock,
  MapPin,
  Settings,
  ShieldCheck,
  Star,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { Avatar } from '@/components/ace/avatar';
import { sportColors } from '@/components/ace/sport-icon';
import { ErrorState, LoadingState } from '@/components/ace/states';
import { TierBadge } from '@/components/ace/tier-badge';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { useSession } from '@/features/auth/session';
import { RelationshipButton } from '@/features/friends/relationship-button';
import { friendAction } from '@/features/friends/schemas';
import { InviteToMatchSheet } from '@/features/invites/invite-to-match-sheet';
import { historyQuery, summaryQuery } from '@/features/results/api';
import { HistoryEntryCard } from '@/features/results/history-entry';
import { TotalsTiles } from '@/features/results/totals-tiles';
import { useInboxCount } from '@/hooks/use-inbox-count';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import type { PublicProfile } from '@/types/api';

import { playerProfileQuery } from './api';
import { DivisionCard } from './division-card';
import { handLabels } from './labels';

const RECENT = 5;
/**
 * Totais e últimas partidas do jogador, da mesma consulta do histórico
 * (RF25): nunca dos contadores de `player_ratings`. Só para perfil aberto.
 */
function HistorySection({ userId }: { userId: string }) {
  const router = useRouter();
  const summary = useQuery(summaryQuery(userId));
  const history = useInfiniteQuery(historyQuery(userId));
  const entries = (history.data?.pages[0]?.data ?? []).slice(0, RECENT);
  if (summary.isPending || history.isPending)
    return <LoadingState label='Carregando histórico…' />;
  if (summary.isError || history.isError)
    return (
      <ErrorState
        error={summary.error ?? history.error}
        retry={() => {
          void summary.refetch();
          void history.refetch();
        }}
      />
    );
  return (
    <View className='gap-3'>
      <TotalsTiles
        totals={summary.data}
        emptyDescription='Os totais aparecem assim que um placar público for registrado.'
      />
      {entries.map((entry) => (
        <HistoryEntryCard
          key={`${entry.match.id}-${entry.teamIndex}`}
          entry={entry}
          showRating={false}
        />
      ))}
      {entries.length > 0 && (
        <Pressable
          accessibilityRole='link'
          className='flex-row items-center justify-center gap-1 py-1 active:opacity-70'
          onPress={() => router.push(`/history?userId=${userId}`)}
        >
          <Text className='font-inter-medium text-sm text-brand'>
            Ver histórico completo
          </Text>
          <ChevronRight size={16} color={palette.colors.brand} />
        </Pressable>
      )}
    </View>
  );
}

/** Uma modalidade no cabeçalho: emblema e divisão quando o perfil é aberto. */
function SportChip({
  profile,
}: {
  profile: PublicProfile['sportProfiles'][number];
}) {
  const tier = profile.rating?.tier;
  const colors = sportColors(profile.sport.slug);
  if (!tier)
    return (
      <View
        className='rounded-pill px-3 py-1.5'
        style={{ backgroundColor: colors.bg }}
      >
        <Text
          className='font-inter-medium text-sm'
          style={{ color: colors.ink }}
        >
          {profile.sport.name}
        </Text>
      </View>
    );
  return (
    <View className='flex-row items-center gap-2 rounded-card border border-border bg-card py-1.5 pl-1.5 pr-3'>
      <TierBadge tier={tier} size={28} />
      <View>
        <Text className='text-xs text-muted-foreground'>
          {profile.sport.name}
        </Text>
        <Text className='font-inter-semibold text-sm text-foreground'>
          {tier.label}
        </Text>
      </View>
      {profile.isPrincipal && (
        <View
          accessible
          accessibilityRole='image'
          accessibilityLabel='Modalidade principal'
        >
          <Star size={13} color={palette.colors.brand} />
        </View>
      )}
    </View>
  );
}

/** Capa marinha com a diagonal do "A" do logo, como no web. */
function Cover({ children }: { children?: ReactNode }) {
  return (
    <View className='h-24 bg-navy'>
      <Svg
        width='100%'
        height='100%'
        viewBox='0 0 100 100'
        preserveAspectRatio='none'
        style={{ position: 'absolute' }}
        pointerEvents='none'
      >
        <Polygon points='72,0 84,0 70,100 58,100' fill={palette.colors.brand} />
      </Svg>
      {children}
    </View>
  );
}

function OwnProfileActions() {
  const router = useRouter();
  const inbox = useInboxCount();
  const badge = inbox.label(inbox.friendRequests);
  return (
    <View className='absolute right-3 top-3 flex-row gap-2'>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Jogadores e amigos'
        hitSlop={8}
        className='h-11 w-11 items-center justify-center rounded-card bg-white/15 active:opacity-70'
        onPress={() => router.push('/players')}
      >
        <Users size={20} color='#ffffff' />
        {badge && (
          <View className='absolute -right-1 -top-1 min-w-5 items-center rounded-pill bg-brand px-1.5'>
            <Text className='font-inter-semibold text-xs text-white'>
              {badge}
            </Text>
          </View>
        )}
      </Pressable>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Conta e configurações'
        hitSlop={8}
        className='h-11 w-11 items-center justify-center rounded-card bg-white/15 active:opacity-70'
        onPress={() => router.push('/account')}
      >
        <Settings size={20} color='#ffffff' />
      </Pressable>
    </View>
  );
}

/** Uma divisão por modalidade, com V/D/E do resumo do histórico (RF25). */
function DivisionsSection({
  profile,
  own,
}: {
  profile: PublicProfile;
  own: boolean;
}) {
  const totals = useQuery(summaryQuery(profile.id));
  return (
    <View className='gap-3'>
      <View className='gap-0.5'>
        <Text variant='subtitle'>Divisões</Text>
        <Text variant='muted'>
          Cada modalidade tem o próprio rating, e a divisão acompanha os
          resultados.
        </Text>
      </View>
      {profile.sportProfiles.length === 0 ? (
        <Text variant='muted'>Nenhuma modalidade cadastrada.</Text>
      ) : (
        profile.sportProfiles.map((sport) => (
          <DivisionCard
            key={sport.sportId}
            profile={sport}
            record={totals.data?.find((t) => t.sportId === sport.sportId)}
            own={own}
            evolutionLink={own}
          />
        ))
      )}
    </View>
  );
}

export function PublicProfileScreen({ userId: own }: { userId?: string } = {}) {
  const params = useLocalSearchParams<{ userId: string }>();
  const userId = own ?? params.userId;
  const { user } = useSession();
  const router = useRouter();
  const player = useQuery(playerProfileQuery(userId ?? ''));
  useRefetchOnFocus(player.refetch);
  const [inviteOpen, setInviteOpen] = useState(false);
  if (player.isPending) return <LoadingState />;
  if (player.isError)
    return <ErrorState error={player.error} retry={() => player.refetch()} />;
  const data = player.data;
  const isMe = user?.id === data.id;
  // Convite não depende de amizade nem de perfil público (T08/T31).
  const canInvite = user !== null && user.id !== data.id;
  // Bloco social (T33): só de `relationship`; o próprio perfil não tem botão.
  const social =
    data.relationship && data.relationship.status !== 'SELF'
      ? friendAction(data.relationship)
      : null;
  const friendsLabel = `${data.friendsCount} ${data.friendsCount === 1 ? 'amigo' : 'amigos'}`;
  const mutedColor = palette.colors['muted-foreground'];
  return (
    <Screen scroll edges={own ? ['top'] : ['bottom']} className='gap-5 pt-4'>
      <View className='overflow-hidden rounded-panel border border-border bg-card'>
        <Cover>{isMe && <OwnProfileActions />}</Cover>
        <View className='-mt-11 gap-3 px-4 pb-4'>
          {/* Ação social ao lado do avatar, abaixo da capa. */}
          <View className='flex-row items-end justify-between gap-2'>
            <Avatar
              name={data.fullName}
              url={data.avatarUrl}
              size={88}
              className='border-4 border-card'
            />
            {social && data.relationship && (
              <View className='flex-row items-center gap-2'>
                <RelationshipButton
                  userId={data.id}
                  name={data.fullName}
                  relationship={data.relationship}
                  size='sm'
                />
              </View>
            )}
          </View>
          <View className='gap-1.5'>
            <Text variant='title'>{data.fullName}</Text>
            <View className='flex-row flex-wrap items-center gap-x-3 gap-y-1'>
              <View className='flex-row items-center gap-1'>
                <MapPin size={14} color={mutedColor} />
                <Text variant='muted'>{`${data.city} · ${data.state}`}</Text>
              </View>
              {data.dominantHand && (
                <View className='flex-row items-center gap-1'>
                  <Hand size={14} color={mutedColor} />
                  <Text variant='muted'>
                    {data.dominantHand === 'AMBI'
                      ? 'Joga com as duas mãos'
                      : `Mão ${handLabels[data.dominantHand].toLowerCase()}`}
                  </Text>
                </View>
              )}
              <View className='flex-row items-center gap-1'>
                {data.restricted ? (
                  <Lock size={13} color={mutedColor} />
                ) : (
                  <ShieldCheck size={14} color={mutedColor} />
                )}
                <Text variant='muted'>
                  {data.restricted
                    ? 'Perfil privado'
                    : data.profileVisibility === 'PRIVATE'
                      ? isMe
                        ? 'Perfil privado'
                        : 'Perfil de amigo'
                      : 'Perfil público'}
                </Text>
              </View>
            </View>
          </View>
          {/* Lista de amigos: só abre quando a API já mostra o perfil aberto. */}
          <Pressable
            accessibilityRole={data.restricted ? undefined : 'link'}
            accessibilityLabel={friendsLabel}
            disabled={data.restricted}
            className='flex-row items-center gap-1.5 self-start rounded-pill bg-muted px-3 py-1 active:opacity-70'
            onPress={() => router.push(`/players/${data.id}/friends`)}
          >
            <Users size={14} color={mutedColor} />
            <Text variant='label' className='text-muted-foreground'>
              {friendsLabel}
            </Text>
            {!data.restricted && <ChevronRight size={14} color={mutedColor} />}
          </Pressable>
          <Text variant='body'>
            {data.bio ||
              (isMe
                ? 'Conte em poucas palavras como você joga.'
                : 'Este jogador ainda não escreveu uma bio.')}
          </Text>
          {data.sportProfiles.length > 0 && (
            <View
              className='flex-row flex-wrap gap-2'
              accessibilityLabel='Modalidades'
            >
              {data.sportProfiles.map((profile) => (
                <SportChip key={profile.sportId} profile={profile} />
              ))}
            </View>
          )}
          {social?.hint && <Text variant='muted'>{social.hint}</Text>}
          {canInvite && (
            <View className='pt-1'>
              <Button
                label='Convidar para partida'
                icon={<UserPlus size={16} color='#fff' />}
                onPress={() => setInviteOpen(true)}
              />
              <InviteToMatchSheet
                player={{
                  id: data.id,
                  fullName: data.fullName,
                  avatarUrl: data.avatarUrl,
                  city: data.city,
                  state: data.state,
                }}
                visible={inviteOpen}
                onClose={() => setInviteOpen(false)}
              />
            </View>
          )}
        </View>
      </View>

      {data.restricted ? (
        <Text variant='muted' className='text-center'>
          {data.relationship?.status === 'NONE'
            ? 'Só amigos veem divisões, rating e histórico deste jogador. Peça amizade para ver o perfil completo.'
            : 'Só amigos veem divisões, rating e histórico deste jogador.'}
        </Text>
      ) : (
        <>
          <DivisionsSection profile={data} own={isMe} />
          <View className='gap-3'>
            <Text variant='subtitle'>Histórico</Text>
            <HistorySection userId={data.id} />
          </View>
        </>
      )}
    </Screen>
  );
}
