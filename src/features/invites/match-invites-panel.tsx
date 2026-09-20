import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { MessageSquareText, Send, UserPlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Avatar } from '@/components/ace/avatar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chips';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import type { MatchDetail } from '@/features/matches/api';
import { categoryLabel } from '@/features/players/labels';
import { firstName } from '@/lib/utils';

import { cancelInvite, type Invite, matchInvitesQuery } from './api';
import { InviteStatusBadge } from './invite-card';
import { useInviteMutation } from './use-invite-mutation';

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View className='flex-1 gap-0.5'>
      <Text className='font-inter-medium text-[11px] uppercase tracking-wider text-muted-foreground'>
        {label}
      </Text>
      <Text variant='label' numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function InviteRow({ invite, matchId }: { invite: Invite; matchId: string }) {
  const router = useRouter();
  const cancel = useInviteMutation(() => cancelInvite(matchId, invite.id), {
    success: 'Convite cancelado.',
  });
  const { invitee } = invite;
  const first = firstName(invitee.fullName);
  const confirmCancel = () =>
    Alert.alert(
      `Cancelar o convite para ${first}?`,
      'Ele deixa de ver a partida, se ela for privada. Você pode convidar de novo depois.',
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Cancelar convite',
          style: 'destructive',
          onPress: () => cancel.mutate(undefined),
        },
      ],
    );
  const muted = palette.colors['muted-foreground'];
  return (
    <View className='gap-3 rounded-card border border-border bg-background p-3'>
      <View className='flex-row items-center gap-3'>
        <Pressable
          accessibilityRole='link'
          accessibilityLabel={`Ver perfil de ${invitee.fullName}`}
          className='flex-1 flex-row items-center gap-3'
          onPress={() => router.push(`/players/${invitee.id}`)}
        >
          <Avatar name={invitee.fullName} url={invitee.avatarUrl} size={40} />
          <View className='flex-1 gap-0.5'>
            <Text variant='label' numberOfLines={1}>
              {invitee.fullName}
            </Text>
            <Text variant='muted'>{`${invitee.city}, ${invitee.state}`}</Text>
          </View>
        </Pressable>
        <InviteStatusBadge status={invite.status} />
      </View>
      <View className='flex-row gap-3'>
        <Meta
          label='Nível'
          value={
            invitee.sportProfile
              ? categoryLabel(invitee.sportProfile)
              : 'Não informado'
          }
        />
        <Meta
          label='Rating'
          value={
            invitee.sportProfile?.rating != null
              ? String(Math.round(invitee.sportProfile.rating))
              : 'Sem rating'
          }
        />
        <Meta
          label='Time'
          value={invite.teamIndex ? `Time ${invite.teamIndex}` : 'Qualquer'}
        />
      </View>
      {invite.message && (
        <View className='flex-row items-start gap-2'>
          <MessageSquareText size={14} color={muted} style={{ marginTop: 2 }} />
          <Text variant='muted' className='flex-1 italic'>
            {invite.message}
          </Text>
        </View>
      )}
      {invite.status === 'PENDING' && (
        <Button
          variant='secondary'
          label='Cancelar convite'
          className='h-10'
          accessibilityLabel={`Cancelar convite para ${invitee.fullName}`}
          disabled={cancel.isPending}
          icon={<X size={15} color={palette.colors.brand} />}
          onPress={confirmCancel}
        />
      )}
    </View>
  );
}

/** Painel do criador: convites pendentes (cancelar) e os já respondidos. */
export function MatchInvitesPanel({
  match,
  canInvite,
  onInvite,
}: {
  match: MatchDetail;
  canInvite: boolean;
  onInvite: () => void;
}) {
  const [tab, setTab] = useState<'PENDING' | 'DECIDED'>('PENDING');
  const pending = useQuery(matchInvitesQuery(match.id, 'PENDING'));
  const all = useQuery({
    ...matchInvitesQuery(match.id),
    enabled: tab === 'DECIDED',
  });
  const decided = all.data?.filter((i) => i.status !== 'PENDING') ?? [];
  const list = tab === 'PENDING' ? pending : all;
  const items = tab === 'PENDING' ? (pending.data ?? []) : decided;
  const pendingCount = pending.data?.length ?? 0;
  return (
    <View className='gap-3 rounded-panel border border-border bg-card p-4'>
      <View className='gap-0.5'>
        <Text className='font-inter-semibold text-xs uppercase tracking-widest text-brand'>
          Quem você chamou
        </Text>
        <View className='flex-row items-center gap-2'>
          <Text variant='subtitle'>Convites da partida</Text>
          {pendingCount > 0 && (
            <View className='min-w-6 items-center rounded-pill bg-brand px-1.5 py-0.5'>
              <Text className='font-inter-bold text-xs text-white'>
                {pendingCount}
              </Text>
            </View>
          )}
        </View>
        <Text variant='muted'>
          Convide pelo nome: só quem tem perfil nesta modalidade pode entrar.
        </Text>
      </View>
      {canInvite && (
        <Button
          label='Convidar jogador'
          icon={<UserPlus size={16} color='#fff' />}
          onPress={onInvite}
        />
      )}
      <View className='flex-row gap-2'>
        <Chip
          label='Pendentes'
          active={tab === 'PENDING'}
          onPress={() => setTab('PENDING')}
        />
        <Chip
          label='Respondidos'
          active={tab === 'DECIDED'}
          onPress={() => setTab('DECIDED')}
        />
      </View>
      {list.isPending ? (
        <LoadingState label='Buscando convites…' />
      ) : list.isError ? (
        <ErrorState error={list.error} retry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Send size={24} color={palette.colors.brand} />}
          title={
            tab === 'PENDING'
              ? 'Nenhum convite aguardando resposta'
              : 'Nenhum convite respondido ainda'
          }
          description={
            canInvite
              ? 'Chame jogadores pelo nome. Quem aceitar entra direto no time.'
              : 'Os convites desta partida aparecem aqui.'
          }
        />
      ) : (
        <View className='gap-2'>
          {items.map((invite) => (
            <InviteRow key={invite.id} invite={invite} matchId={match.id} />
          ))}
        </View>
      )}
    </View>
  );
}
