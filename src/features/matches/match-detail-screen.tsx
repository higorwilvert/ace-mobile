import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CalendarDays,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Gauge,
  Globe,
  Info,
  Lock,
  MapPin,
  Pencil,
  Send,
  Trophy,
  UserRound,
  Users,
  X,
  XCircle,
} from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { z } from 'zod';

import { Avatar } from '@/components/ace/avatar';
import { SportIcon } from '@/components/ace/sport-icon';
import {
  EmptyState,
  ErrorState,
  FormError,
  LoadingState,
} from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import palette from '@/config/palette.json';
import { useSession } from '@/features/auth/session';
import { acceptInvite, declineInvite } from '@/features/invites/api';
import { InviteSheet } from '@/features/invites/invite-sheet';
import { MatchInvitesPanel } from '@/features/invites/match-invites-panel';
import { invitePermissions } from '@/features/invites/schemas';
import { useInviteMutation } from '@/features/invites/use-invite-mutation';
import { categoryRange, policyLabels } from '@/features/players/labels';
import { ResultPanel } from '@/features/results/result-panel';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { ApiError } from '@/lib/api-client';
import { cn, firstName } from '@/lib/utils';

import {
  applyToMatch,
  cancelMatch,
  type MatchDetail,
  type MatchParticipant,
  matchQuery,
  publishMatch,
  removeParticipant,
  type TeamIndex,
  withdrawApplication,
} from './api';
import { ApplicationsPanel } from './applications-panel';
import { CourtBoard } from './court-board';
import { Badge, StatusBadge } from './match-card';
import {
  durationLabel,
  formatShort,
  formatWhenLong,
  type MatchPermissions,
  matchPermissions,
  matchTitle,
  visibilityLabels,
} from './schemas';
import { useMatchMutation } from './use-match-mutation';

export function MatchUnavailable() {
  const router = useRouter();
  return (
    <Screen edges={['bottom']} className='justify-center'>
      <EmptyState
        icon={<CircleDot size={28} color={palette.colors.brand} />}
        title='Esta partida não está disponível'
        description='Ela pode ter sido removida, ser privada ou o link estar incorreto.'
      >
        <Button
          label='Explorar partidas'
          onPress={() => router.replace('/matches')}
        />
      </EmptyState>
    </Screen>
  );
}

function Panel({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <View
      className={cn(
        'gap-3 rounded-panel border border-border bg-card p-4',
        className,
      )}
    >
      {(eyebrow || title) && (
        <View className='gap-0.5'>
          {eyebrow && (
            <Text className='font-inter-semibold text-xs uppercase tracking-widest text-brand'>
              {eyebrow}
            </Text>
          )}
          {title && <Text variant='subtitle'>{title}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

const bannerTones = {
  creator: { bg: palette.colors['brand-muted'], ink: palette.colors.brand },
  confirmed: { bg: '#e3f3ea', ink: palette.colors.success },
  pending: { bg: '#fbf0d3', ink: '#8a6420' },
  declined: {
    bg: palette.colors['destructive-soft'],
    ink: palette.colors.destructive,
  },
  outsider: {
    bg: palette.colors.muted,
    ink: palette.colors['muted-foreground'],
  },
} as const;

/** Faixa de situação do visitante: uma frase por papel + a ação que lhe cabe. */
function ViewerBanner({
  match,
  permissions,
  viewerId,
  onWithdraw,
  onAcceptInvite,
  onDeclineInvite,
  busy,
}: {
  match: MatchDetail;
  permissions: MatchPermissions;
  viewerId: string;
  onWithdraw: () => void;
  onAcceptInvite: () => void;
  onDeclineInvite: () => void;
  busy: boolean;
}) {
  const team = match.viewer?.participation?.teamIndex;
  const invite = match.viewer?.invite ?? null;
  // Mesma regra da caixa de convites: só o que a API aceitaria agora.
  const inviteRules = invite
    ? invitePermissions(
        {
          status: invite.status,
          inviter: match.creator,
          invitee: { id: viewerId },
          match,
        },
        viewerId,
      )
    : null;
  const waiting =
    match.status === 'CONFIRMED' ? permissions.resultBlockedReason : null;
  const content: Record<
    MatchPermissions['viewerRole'],
    { text: string; tone: keyof typeof bannerTones }
  > = {
    creator: {
      text:
        match.status === 'DRAFT'
          ? 'Rascunho: publique quando estiver pronta para receber candidaturas.'
          : [
              permissions.lockedReason ??
                'Você organiza esta partida. Aprove candidaturas e cuide dos times por aqui.',
              waiting,
            ]
              .filter(Boolean)
              .join(' '),
      tone: 'creator',
    },
    confirmed: {
      text:
        match.status === 'COMPLETED'
          ? `Partida encerrada${team ? ` · você jogou no Time ${team}` : ''}.`
          : [
              `Você está confirmado${team ? ` no Time ${team}` : ''}. Bom jogo!`,
              waiting,
            ]
              .filter(Boolean)
              .join(' '),
      tone: 'confirmed',
    },
    pending: {
      text: 'Candidatura enviada. O criador vai decidir em breve.',
      tone: 'pending',
    },
    declined: {
      text: 'Sua candidatura não foi aceita desta vez.',
      tone: 'declined',
    },
    removed: {
      text: 'Você foi removido desta partida pelo criador.',
      tone: 'declined',
    },
    invited: {
      text: [
        `${firstName(match.creator.fullName)} convidou você para esta partida${invite?.teamIndex ? ` (Time ${invite.teamIndex})` : ''}.`,
        inviteRules?.blockedReason ??
          (match.teamSize === 2
            ? 'Aceite por aqui ou toque na vaga do time em que prefere jogar.'
            : null),
      ]
        .filter(Boolean)
        .join(' '),
      tone: 'pending',
    },
    outsider: { text: permissions.applyBlockedReason ?? '', tone: 'outsider' },
  };
  const { text, tone } = content[permissions.viewerRole];
  if (!text) return null;
  const { bg, ink } = bannerTones[tone];
  return (
    <View
      className='gap-3 rounded-card p-3'
      style={{ backgroundColor: bg }}
      accessibilityRole='summary'
    >
      <View className='flex-row items-start gap-2'>
        <Info size={17} color={ink} style={{ marginTop: 2 }} />
        <Text className='flex-1 text-sm leading-5' style={{ color: ink }}>
          {text}
        </Text>
      </View>
      {permissions.canWithdraw && (
        <Button
          variant='secondary'
          label='Retirar candidatura'
          disabled={busy}
          onPress={onWithdraw}
        />
      )}
      {inviteRules && (inviteRules.canAccept || inviteRules.canDecline) && (
        <View className='flex-row gap-2'>
          {inviteRules.canAccept && (
            <Button
              className='flex-1'
              label='Aceitar convite'
              disabled={busy}
              icon={<Check size={16} color='#fff' />}
              onPress={onAcceptInvite}
            />
          )}
          {inviteRules.canDecline && (
            <Button
              className='flex-1'
              variant='secondary'
              label='Recusar'
              disabled={busy}
              icon={<X size={16} color={palette.colors.brand} />}
              onPress={onDeclineInvite}
            />
          )}
        </View>
      )}
    </View>
  );
}

function Fact({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <View className='flex-row items-start gap-3'>
      <View className='h-9 w-9 items-center justify-center rounded-card bg-brand-muted'>
        {icon}
      </View>
      <View className='flex-1 gap-0.5'>
        <Text className='font-inter-medium text-[11px] uppercase tracking-wider text-muted-foreground'>
          {label}
        </Text>
        {children}
      </View>
    </View>
  );
}

export function MatchDetailScreen() {
  const { matchId = '' } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const valid = z.string().uuid().safeParse(matchId).success;
  const match = useQuery({ ...matchQuery(matchId), enabled: valid });
  useRefetchOnFocus(match.refetch);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [reason, setReason] = useState('');

  const apply = useMatchMutation(
    (teamIndex: TeamIndex | undefined) =>
      applyToMatch(matchId, teamIndex ? { teamIndex } : {}),
    {
      success: (result) =>
        result.data.teamIndex
          ? `Candidatura enviada para o Time ${result.data.teamIndex}.`
          : 'Candidatura enviada.',
    },
  );
  const withdraw = useMatchMutation(() => withdrawApplication(matchId), {
    success: 'Candidatura retirada.',
  });
  const { user } = useSession();
  const inviteId = match.data?.viewer?.invite?.id ?? '';
  const acceptInvitation = useInviteMutation(
    (teamIndex: TeamIndex | undefined) =>
      acceptInvite(matchId, inviteId, teamIndex ? { teamIndex } : {}),
    {
      success: (result) =>
        `Você está confirmado no Time ${result.data.teamIndex ?? '—'}. Bom jogo!`,
    },
  );
  const declineInvitation = useInviteMutation(
    () => declineInvite(matchId, inviteId),
    { success: 'Convite recusado.' },
  );
  const publish = useMatchMutation(() => publishMatch(matchId), {
    matchId,
    success: 'Partida publicada. Ela já aparece em Partidas.',
  });
  const cancel = useMatchMutation(
    (value: string) => cancelMatch(matchId, { reason: value.trim() || null }),
    {
      matchId,
      success: 'Partida cancelada. Os jogadores confirmados serão avisados.',
      toastError: false,
      onSuccess: () => setCancelOpen(false),
    },
  );
  const remove = useMatchMutation(
    (participantId: string) => removeParticipant(matchId, participantId),
    { success: 'Jogador removido da partida.' },
  );
  const busy =
    apply.isPending ||
    withdraw.isPending ||
    publish.isPending ||
    remove.isPending ||
    acceptInvitation.isPending ||
    declineInvitation.isPending;

  const confirmWithdraw = () =>
    Alert.alert(
      'Retirar candidatura?',
      'Você sai da fila desta partida. Pode se candidatar de novo enquanto houver vaga.',
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Retirar',
          style: 'destructive',
          onPress: () => withdraw.mutate(undefined),
        },
      ],
    );
  const confirmDecline = () =>
    Alert.alert(
      'Recusar este convite?',
      'O criador será avisado. Ele pode convidar você de novo mais tarde.',
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Recusar',
          style: 'destructive',
          onPress: () => declineInvitation.mutate(undefined),
        },
      ],
    );
  const confirmRemove = (participant: MatchParticipant) =>
    Alert.alert(
      `Remover ${participant.user.fullName.split(' ')[0]} da partida?`,
      'O jogador sai do time e não poderá se candidatar de novo a esta partida. Se ela estava lotada, volta a receber candidaturas.',
      [
        { text: 'Manter jogador', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => remove.mutate(participant.id),
        },
      ],
    );

  if (!valid) return <MatchUnavailable />;
  if (match.isPending) return <LoadingState label='Abrindo a partida…' />;
  if (match.isError) {
    if (match.error instanceof ApiError && match.error.status === 404)
      return <MatchUnavailable />;
    return <ErrorState error={match.error} retry={() => match.refetch()} />;
  }
  const m = match.data;
  const permissions = matchPermissions(m);
  const isCreator = m.viewer?.isCreator ?? false;
  const showManage =
    permissions.canEdit || permissions.canPublish || permissions.canCancel;
  const muted = palette.colors['muted-foreground'];
  const brand = palette.colors.brand;

  return (
    <Screen scroll edges={['bottom']} className='gap-4 pt-4'>
      <View className='flex-row items-start gap-3'>
        <View className='flex-1 gap-1.5'>
          <Text className='font-inter-semibold text-xs uppercase tracking-widest text-muted-foreground'>
            {`${m.sport.name} · ${formatShort(m.teamSize)}`}
          </Text>
          <Text variant='title' accessibilityRole='header'>
            {matchTitle(m)}
          </Text>
          <View className='flex-row flex-wrap gap-1.5'>
            <StatusBadge status={m.status} scheduledAt={m.scheduledAt} />
            <Badge
              label={visibilityLabels[m.visibility]}
              tone='neutral'
              icon={
                m.visibility === 'PUBLIC' ? (
                  <Globe size={11} color={muted} />
                ) : (
                  <Lock size={11} color={muted} />
                )
              }
            />
          </View>
        </View>
        <SportIcon slug={m.sport.slug} size={52} />
      </View>

      <ViewerBanner
        match={m}
        permissions={permissions}
        viewerId={user?.id ?? ''}
        onWithdraw={confirmWithdraw}
        onAcceptInvite={() => acceptInvitation.mutate(undefined)}
        onDeclineInvite={confirmDecline}
        busy={busy}
      />

      <ResultPanel match={m} />

      <Panel eyebrow='Em quadra' title='Times e vagas'>
        <CourtBoard
          match={m}
          permissions={permissions}
          onPickSlot={(teamIndex) =>
            permissions.canAcceptInvite
              ? acceptInvitation.mutate(teamIndex)
              : apply.mutate(teamIndex)
          }
          onRemove={confirmRemove}
          busy={busy}
        />
        {permissions.canRecordResult && (
          <Button
            label='Registrar placar'
            icon={<Trophy size={17} color='#fff' />}
            onPress={() => router.push(`/matches/${m.id}/result`)}
          />
        )}
        {permissions.canApply && (
          <View className='gap-2 pt-1'>
            <Button
              label='Candidatar-se'
              busy={apply.isPending}
              busyLabel='Enviando…'
              disabled={busy}
              icon={<Send size={17} color='#fff' />}
              onPress={() => apply.mutate(undefined)}
            />
            <Text variant='muted' className='text-center'>
              Prefere um time? Toque numa vaga livre para escolher. O criador
              decide quem entra.
            </Text>
          </View>
        )}
      </Panel>

      {m.description && (
        <Panel title='Sobre a partida'>
          <Text>{m.description}</Text>
        </Panel>
      )}

      {m.status === 'CANCELLED' && (
        <Panel className='border-destructive-soft bg-destructive-soft'>
          <View className='flex-row items-center gap-2'>
            <XCircle size={18} color={palette.colors.destructive} />
            <Text variant='subtitle' className='text-destructive'>
              Partida cancelada
            </Text>
          </View>
          <Text className='text-destructive'>
            {m.cancelledReason ?? 'O criador não informou o motivo.'}
          </Text>
        </Panel>
      )}

      <Panel title='Detalhes'>
        <Fact icon={<CalendarDays size={17} color={brand} />} label='Quando'>
          <Text variant='label'>
            {formatWhenLong(m.scheduledAt, m.durationMinutes)}
          </Text>
        </Fact>
        <Fact icon={<Clock3 size={17} color={brand} />} label='Duração'>
          <Text variant='label'>{durationLabel(m.durationMinutes)}</Text>
        </Fact>
        <Fact icon={<MapPin size={17} color={brand} />} label='Onde'>
          <Text variant='label'>
            {m.arena?.name ?? m.locationText ?? 'Local a combinar'}
          </Text>
          {m.arena?.address && <Text variant='muted'>{m.arena.address}</Text>}
          <Text variant='muted'>{`${m.city}, ${m.state}`}</Text>
        </Fact>
        <Fact icon={<Gauge size={17} color={brand} />} label='Nível'>
          <Text variant='label'>
            {categoryRange(m.sport, m.minCategoryCode, m.maxCategoryCode)}
          </Text>
        </Fact>
        <Fact icon={<Users size={17} color={brand} />} label='Composição'>
          <Text variant='label'>{policyLabels[m.genderPolicy]}</Text>
        </Fact>
        <Fact icon={<UserRound size={17} color={brand} />} label='Organizador'>
          <Pressable
            accessibilityRole='link'
            accessibilityLabel={`Ver perfil de ${m.creator.fullName}`}
            className='flex-row items-center gap-2 self-start active:opacity-70'
            onPress={() => router.push(`/players/${m.creator.id}`)}
          >
            <Avatar
              name={m.creator.fullName}
              url={m.creator.avatarUrl}
              size={28}
            />
            <Text variant='label' className='text-brand'>
              {m.creator.fullName}
            </Text>
            <ChevronRight size={16} color={brand} />
          </Pressable>
        </Fact>
      </Panel>

      {isCreator && permissions.canManage && <ApplicationsPanel match={m} />}
      {isCreator && permissions.canManage && (
        <MatchInvitesPanel
          match={m}
          canInvite={permissions.canInvite}
          onInvite={() => setInviteOpen(true)}
        />
      )}

      {isCreator && showManage && (
        <Panel title='Gerenciar'>
          {permissions.canPublish && (
            <Button
              label='Publicar partida'
              busy={publish.isPending}
              busyLabel='Publicando…'
              icon={<Send size={16} color='#fff' />}
              onPress={() => publish.mutate(undefined)}
            />
          )}
          {permissions.canEdit && (
            <Button
              variant='secondary'
              label='Editar partida'
              icon={<Pencil size={16} color={brand} />}
              onPress={() => router.push(`/matches/${m.id}/edit`)}
            />
          )}
          {permissions.canCancel && (
            <Button
              variant='ghost'
              label='Cancelar partida'
              className='border border-destructive'
              icon={<XCircle size={16} color={palette.colors.destructive} />}
              onPress={() => {
                cancel.reset();
                setReason('');
                setCancelOpen(true);
              }}
            />
          )}
          {permissions.lockedReason && (
            <Text variant='muted'>{permissions.lockedReason}</Text>
          )}
        </Panel>
      )}

      {isCreator && (
        <InviteSheet
          match={m}
          visible={inviteOpen}
          onClose={() => setInviteOpen(false)}
        />
      )}

      <Sheet
        visible={cancelOpen}
        title='Cancelar esta partida?'
        onClose={() => {
          if (!cancel.isPending) setCancelOpen(false);
        }}
      >
        <Text variant='muted'>
          Os jogadores confirmados serão avisados. Esta ação não pode ser
          desfeita.
        </Text>
        <TextField
          label='Motivo (opcional)'
          placeholder='Ex.: previsão de chuva'
          value={reason}
          onChangeText={setReason}
          multiline
          maxLength={500}
          editable={!cancel.isPending}
        />
        <FormError error={cancel.error} />
        <View className='gap-2 pb-2'>
          <Button
            variant='destructive'
            label='Cancelar partida'
            busy={cancel.isPending}
            busyLabel='Cancelando…'
            onPress={() => cancel.mutate(reason)}
          />
          <Button
            variant='ghost'
            label='Manter partida'
            disabled={cancel.isPending}
            onPress={() => setCancelOpen(false)}
          />
        </View>
      </Sheet>
    </Screen>
  );
}
