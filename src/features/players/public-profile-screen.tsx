import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, Lock, UserPlus, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ace/avatar';
import { SportIcon, sportColors } from '@/components/ace/sport-icon';
import { ErrorState, LoadingState } from '@/components/ace/states';
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
import type { PublicProfile } from '@/types/api';

import { playerProfileQuery } from './api';
import { handLabels } from './labels';
import { profileDetails } from './sports-screen';

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

function SportCard({
  profile,
}: {
  profile: PublicProfile['sportProfiles'][number];
}) {
  const { rating } = profile;
  return (
    <View className='gap-3 rounded-panel border border-border bg-card p-4'>
      <View className='flex-row items-center gap-3'>
        <SportIcon slug={profile.sport.slug} />
        <View className='flex-1 gap-0.5'>
          <Text variant='subtitle'>{profile.sport.name}</Text>
          <Text variant='muted'>
            {profileDetails(profile).join(' · ') || 'Sem detalhes'}
          </Text>
        </View>
      </View>
      {rating && (
        <View className='flex-row items-center justify-between rounded-card bg-muted px-3 py-2'>
          <View>
            <Text variant='muted'>Rating Glicko-2</Text>
            <Text className='font-inter-bold text-xl'>
              {String(Math.round(rating.rating))}
            </Text>
          </View>
          <View className='items-end'>
            <Text variant='muted'>{`${rating.matchesPlayed} partidas`}</Text>
            <Text variant='label'>
              {`${rating.wins}V · ${rating.losses}D · ${rating.draws}E`}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

export function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useSession();
  const router = useRouter();
  const player = useQuery(playerProfileQuery(userId ?? ''));
  const [inviteOpen, setInviteOpen] = useState(false);
  if (player.isPending) return <LoadingState />;
  if (player.isError)
    return <ErrorState error={player.error} retry={() => player.refetch()} />;
  const data = player.data;
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
    <Screen scroll edges={['bottom']} className='gap-5 pt-4'>
      <View className='items-center gap-2'>
        <Avatar name={data.fullName} url={data.avatarUrl} size={96} />
        <Text variant='title' className='text-center'>
          {data.fullName}
        </Text>
        <Text variant='muted'>{`${data.city} · ${data.state}`}</Text>
        <View
          className={`flex-row items-center gap-1 rounded-pill px-3 py-1 ${
            data.restricted ? 'bg-muted' : 'bg-brand-light'
          }`}
        >
          {data.restricted && (
            <Lock size={12} color={palette.colors['muted-foreground']} />
          )}
          <Text
            className={`font-inter-medium text-xs ${
              data.restricted ? 'text-muted-foreground' : 'text-brand'
            }`}
          >
            {data.restricted ? 'Perfil privado' : 'Jogador ACE'}
          </Text>
        </View>
        <Text variant='body' className='text-center'>
          {data.bio || 'Este jogador ainda não escreveu uma bio.'}
        </Text>
        {data.dominantHand && (
          <Text variant='muted'>{`Mão dominante: ${handLabels[data.dominantHand]}`}</Text>
        )}
        {social && data.relationship && (
          <View className='w-full items-center gap-2 pt-1'>
            <View className='flex-row items-center justify-center gap-2'>
              <RelationshipButton
                userId={data.id}
                name={data.fullName}
                relationship={data.relationship}
              />
            </View>
            {social.hint && <Text variant='muted'>{social.hint}</Text>}
          </View>
        )}
        {/* Lista de amigos: só abre quando a API já mostra o perfil aberto. */}
        <Pressable
          accessibilityRole={data.restricted ? undefined : 'link'}
          accessibilityLabel={friendsLabel}
          disabled={data.restricted}
          className='flex-row items-center gap-1.5 rounded-pill bg-muted px-3 py-1 active:opacity-70'
          onPress={() => router.push(`/players/${data.id}/friends`)}
        >
          <Users size={14} color={mutedColor} />
          <Text variant='label' className='text-muted-foreground'>
            {friendsLabel}
          </Text>
          {!data.restricted && <ChevronRight size={14} color={mutedColor} />}
        </Pressable>
        {canInvite && (
          <View className='w-full pt-2'>
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

      {data.restricted ? (
        <View className='gap-3'>
          <View className='flex-row flex-wrap justify-center gap-2'>
            {data.sportProfiles.map((profile) => {
              const colors = sportColors(profile.sport.slug);
              return (
                <View
                  key={profile.sportId}
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
            })}
          </View>
          <Text variant='muted' className='text-center'>
            {data.relationship?.status === 'NONE'
              ? 'Só amigos veem categoria, rating e histórico deste jogador. Peça amizade para ver o perfil completo.'
              : 'Só amigos veem categoria, rating e histórico deste jogador.'}
          </Text>
        </View>
      ) : (
        <>
          <View className='gap-3'>
            <Text variant='subtitle'>Modalidades</Text>
            {data.sportProfiles.length === 0 ? (
              <Text variant='muted'>Nenhuma modalidade cadastrada.</Text>
            ) : (
              data.sportProfiles.map((profile) => (
                <SportCard key={profile.sportId} profile={profile} />
              ))
            )}
          </View>
          <View className='gap-3'>
            <Text variant='subtitle'>Histórico</Text>
            <HistorySection userId={data.id} />
          </View>
        </>
      )}
    </Screen>
  );
}
