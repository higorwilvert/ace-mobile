import { useRouter } from 'expo-router';
import {
  CalendarDays,
  Check,
  Info,
  MapPin,
  MessageSquareText,
  X,
} from 'lucide-react-native';
import { Alert, Pressable, View } from 'react-native';

import { Avatar } from '@/components/ace/avatar';
import { SportIcon } from '@/components/ace/sport-icon';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import type { InviteStatus } from '@/features/matches/api';
import { SlotDots } from '@/features/matches/court-board';
import { Badge, StatusBadge } from '@/features/matches/match-card';
import {
  formatShort,
  formatWhen,
  matchTitle,
  placeLabel,
} from '@/features/matches/schemas';
import { firstName } from '@/lib/utils';

import {
  acceptInvite,
  cancelInvite,
  declineInvite,
  type MyInvite,
} from './api';
import { invitePermissions, inviteStatusLabels } from './schemas';
import { useInviteMutation } from './use-invite-mutation';

const statusTone = {
  PENDING: 'amber',
  ACCEPTED: 'success',
  DECLINED: 'neutral',
  CANCELLED: 'neutral',
} as const;
export function InviteStatusBadge({ status }: { status: InviteStatus }) {
  return <Badge label={inviteStatusLabels[status]} tone={statusTone[status]} />;
}

/**
 * Convite na caixa de entrada/saída: a partida, quem está do outro lado e
 * só as ações que o backend aceitaria agora.
 */
export function InviteCard({
  invite,
  viewerId,
}: {
  invite: MyInvite;
  viewerId: string;
}) {
  const router = useRouter();
  const permissions = invitePermissions(invite, viewerId);
  const other =
    permissions.role === 'invitee' ? invite.inviter : invite.invitee;
  const first = firstName(other.fullName);
  const accept = useInviteMutation(
    () => acceptInvite(invite.matchId, invite.id),
    {
      success: (result) =>
        `Você está confirmado no Time ${result.data.teamIndex ?? '—'}. Bom jogo!`,
    },
  );
  const decline = useInviteMutation(
    () => declineInvite(invite.matchId, invite.id),
    { success: 'Convite recusado.' },
  );
  const cancel = useInviteMutation(
    () => cancelInvite(invite.matchId, invite.id),
    { success: 'Convite cancelado.' },
  );
  const busy = accept.isPending || decline.isPending || cancel.isPending;
  const confirmDecline = () =>
    Alert.alert(
      'Recusar este convite?',
      'O criador será avisado. Ele pode convidar você de novo mais tarde.',
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Recusar',
          style: 'destructive',
          onPress: () => decline.mutate(undefined),
        },
      ],
    );
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
  const m = invite.match;
  const muted = palette.colors['muted-foreground'];
  const showFooter =
    permissions.canAccept ||
    permissions.canDecline ||
    permissions.canCancel ||
    permissions.blockedReason;
  return (
    <View
      className='gap-3 rounded-panel border border-border bg-card p-4'
      style={{ opacity: busy ? 0.7 : 1 }}
    >
      <View className='flex-row items-center gap-3'>
        <Pressable
          accessibilityRole='link'
          accessibilityLabel={`Ver perfil de ${other.fullName}`}
          className='flex-1 flex-row items-center gap-3 active:opacity-70'
          onPress={() => router.push(`/players/${other.id}`)}
        >
          <Avatar name={other.fullName} url={other.avatarUrl} size={40} />
          <View className='flex-1 gap-0.5'>
            <Text variant='label' numberOfLines={1}>
              {other.fullName}
            </Text>
            <Text variant='muted'>
              {permissions.role === 'invitee'
                ? `convidou você${invite.teamIndex ? ` para o Time ${invite.teamIndex}` : ''}`
                : `convidado${invite.teamIndex ? ` para o Time ${invite.teamIndex}` : ''}`}
            </Text>
          </View>
        </Pressable>
        <InviteStatusBadge status={invite.status} />
      </View>

      {invite.message && (
        <View className='flex-row items-start gap-2 rounded-card bg-muted px-3 py-2'>
          <MessageSquareText size={15} color={muted} style={{ marginTop: 2 }} />
          <Text className='flex-1 text-sm italic leading-5'>
            {invite.message}
          </Text>
        </View>
      )}

      <Pressable
        accessibilityRole='button'
        accessibilityLabel={`Abrir ${matchTitle(m)}`}
        className='flex-row items-start gap-3 rounded-card border border-border p-3 active:bg-brand-muted'
        onPress={() => router.push(`/matches/${m.id}`)}
      >
        <SportIcon slug={m.sport.slug} size={36} />
        <View className='flex-1 gap-1'>
          <Text variant='label' numberOfLines={1}>
            {matchTitle(m)}
          </Text>
          <Text variant='muted'>
            {`${m.sport.name} · ${formatShort(m.teamSize)}`}
          </Text>
          <View className='flex-row items-center gap-1.5'>
            <CalendarDays size={13} color={muted} />
            <Text variant='muted'>{formatWhen(m.scheduledAt)}</Text>
          </View>
          <View className='flex-row items-center gap-1.5'>
            <MapPin size={13} color={muted} />
            <Text variant='muted' className='flex-1' numberOfLines={1}>
              {`${placeLabel(m)} · ${m.city}, ${m.state}`}
            </Text>
          </View>
          <View className='flex-row items-center gap-2'>
            <SlotDots teamSize={m.teamSize} confirmed={m.capacity.confirmed} />
            <Text variant='muted'>
              {`${m.capacity.confirmed} de ${m.capacity.total}`}
            </Text>
          </View>
        </View>
        <StatusBadge status={m.status} scheduledAt={m.scheduledAt} />
      </Pressable>

      {showFooter && (
        <View className='gap-2'>
          {permissions.blockedReason && (
            <View className='flex-row items-start gap-2'>
              <Info size={15} color={muted} style={{ marginTop: 2 }} />
              <Text variant='muted' className='flex-1'>
                {permissions.blockedReason}
              </Text>
            </View>
          )}
          <View className='flex-row gap-2'>
            {permissions.canAccept && (
              <Button
                className='flex-1'
                label='Aceitar'
                accessibilityLabel={`Aceitar convite de ${first}`}
                busy={accept.isPending}
                busyLabel='Entrando…'
                disabled={busy}
                icon={<Check size={16} color='#fff' />}
                onPress={() => accept.mutate(undefined)}
              />
            )}
            {permissions.canDecline && (
              <Button
                className='flex-1'
                variant='secondary'
                label='Recusar'
                accessibilityLabel={`Recusar convite de ${first}`}
                disabled={busy}
                icon={<X size={16} color={palette.colors.brand} />}
                onPress={confirmDecline}
              />
            )}
            {permissions.canCancel && (
              <Button
                className='flex-1'
                variant='secondary'
                label='Cancelar convite'
                accessibilityLabel={`Cancelar convite para ${first}`}
                disabled={busy}
                icon={<X size={16} color={palette.colors.brand} />}
                onPress={confirmCancel}
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
}
