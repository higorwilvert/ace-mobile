import { CalendarDays, Gauge, Lock, MapPin } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ace/avatar';
import { SportIcon } from '@/components/ace/sport-icon';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { categoryRange, policyLabels } from '@/features/players/labels';
import { cn, firstName } from '@/lib/utils';

import type { MatchStatus, MatchSummary, ParticipantStatus } from './api';
import { SlotDots } from './court-board';
import {
  formatShort,
  formatWhen,
  matchStatusLabel,
  matchStatusLabels,
  matchTitle,
  participantStatusLabels,
  placeLabel,
} from './schemas';

// Tons dos selos: mesma leitura do web (aberta = marca, confirmada = verde,
// rascunho = neutro, encerrada = navy, cancelada = vermelho, em andamento e
// "aguardando placar" = âmbar).
const tones = {
  brand: { bg: palette.colors['brand-muted'], ink: palette.colors.brand },
  success: { bg: '#e3f3ea', ink: palette.colors.success },
  neutral: {
    bg: palette.colors.muted,
    ink: palette.colors['muted-foreground'],
  },
  navy: { bg: '#e2e7f0', ink: palette.colors.navy },
  danger: {
    bg: palette.colors['destructive-soft'],
    ink: palette.colors.destructive,
  },
  amber: { bg: '#fbf0d3', ink: '#8a6420' },
} as const;
const statusTone: Record<MatchStatus, keyof typeof tones> = {
  OPEN: 'brand',
  CONFIRMED: 'success',
  DRAFT: 'neutral',
  COMPLETED: 'navy',
  CANCELLED: 'danger',
  IN_PROGRESS: 'amber',
};
const participationTone: Record<ParticipantStatus, keyof typeof tones> = {
  PENDING: 'amber',
  CONFIRMED: 'success',
  DECLINED: 'danger',
  REMOVED: 'neutral',
};

export function Badge({
  label,
  tone,
  icon,
}: {
  label: string;
  tone: keyof typeof tones;
  icon?: ReactNode;
}) {
  const { bg, ink } = tones[tone];
  return (
    <View
      className='flex-row items-center gap-1 rounded-pill px-2 py-0.5'
      style={{ backgroundColor: bg }}
    >
      {icon}
      <Text className='font-inter-semibold text-xs' style={{ color: ink }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Situação da partida. Com `scheduledAt`, uma confirmada que já aconteceu
 * aparece como "Aguardando placar" (RF23) em vez de "Confirmada".
 */
export function StatusBadge({
  status,
  scheduledAt,
}: {
  status: MatchStatus;
  scheduledAt?: string;
}) {
  const label = scheduledAt
    ? matchStatusLabel({ status, scheduledAt })
    : matchStatusLabels[status];
  return (
    <Badge
      label={label}
      tone={label === 'Aguardando placar' ? 'amber' : statusTone[status]}
    />
  );
}
export function ParticipationBadge({ status }: { status: ParticipantStatus }) {
  return (
    <Badge
      label={participantStatusLabels[status]}
      tone={participationTone[status]}
    />
  );
}

export function Fact({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View className='flex-row items-center gap-2'>
      {icon}
      <Text variant='muted' className='flex-1' numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

/** Card da lista; `onPress` abre o detalhe, `children` traz ações extras. */
export function MatchCard({
  match,
  showStatus = false,
  onPress,
  children,
}: {
  match: MatchSummary;
  showStatus?: boolean;
  onPress?: () => void;
  children?: ReactNode;
}) {
  const muted = palette.colors['muted-foreground'];
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={matchTitle(match)}
      testID={`match-card-${match.id}`}
      disabled={!onPress}
      onPress={onPress}
      className={cn(
        'gap-3 rounded-panel border border-border bg-card p-4',
        onPress && 'active:bg-brand-muted',
        match.status === 'CANCELLED' && 'opacity-70',
      )}
    >
      <View className='flex-row items-center gap-3'>
        <SportIcon slug={match.sport.slug} size={40} />
        <View className='flex-1 gap-0.5'>
          <Text className='font-inter-semibold text-xs uppercase tracking-wider text-muted-foreground'>
            {`${match.sport.name} · ${formatShort(match.teamSize)}`}
          </Text>
          <Text variant='subtitle' numberOfLines={1}>
            {matchTitle(match)}
          </Text>
        </View>
        <View className='items-end gap-1'>
          {showStatus && (
            <StatusBadge
              status={match.status}
              scheduledAt={match.scheduledAt}
            />
          )}
          {match.visibility === 'PRIVATE' && (
            <Badge
              label='Privada'
              tone='neutral'
              icon={<Lock size={11} color={muted} />}
            />
          )}
        </View>
      </View>
      <View className='gap-1.5'>
        <Fact
          icon={<CalendarDays size={15} color={muted} />}
          text={formatWhen(match.scheduledAt)}
        />
        <Fact
          icon={<MapPin size={15} color={muted} />}
          text={`${placeLabel(match)} · ${match.city}, ${match.state}`}
        />
        <Fact
          icon={<Gauge size={15} color={muted} />}
          text={`${categoryRange(match.sport, match.minCategoryCode, match.maxCategoryCode)} · ${policyLabels[match.genderPolicy]}`}
        />
      </View>
      <View className='flex-row items-center justify-between border-t border-border pt-3'>
        <View className='flex-row items-center gap-2'>
          <SlotDots
            teamSize={match.teamSize}
            confirmed={match.capacity.confirmed}
          />
          <Text variant='label'>
            {`${match.capacity.confirmed} de ${match.capacity.total}`}
          </Text>
        </View>
        <View className='flex-row items-center gap-2'>
          <Avatar
            name={match.creator.fullName}
            url={match.creator.avatarUrl}
            size={24}
          />
          <Text variant='muted'>{firstName(match.creator.fullName)}</Text>
        </View>
      </View>
      {children && (
        <View className='flex-row flex-wrap items-center gap-2'>
          {children}
        </View>
      )}
    </Pressable>
  );
}

function Bone({ className }: { className: string }) {
  return <View className={cn('rounded-tiny bg-muted', className)} />;
}
export function MatchCardSkeleton() {
  return (
    <View
      className='gap-3 rounded-panel border border-border bg-card p-4'
      accessibilityElementsHidden
      importantForAccessibility='no-hide-descendants'
      testID='match-card-skeleton'
    >
      <View className='flex-row items-center gap-3'>
        <Bone className='h-10 w-10 rounded-card' />
        <View className='flex-1 gap-2'>
          <Bone className='h-3 w-24' />
          <Bone className='h-4 w-40' />
        </View>
      </View>
      <Bone className='h-3 w-48' />
      <Bone className='h-3 w-56' />
      <Bone className='h-3 w-36' />
    </View>
  );
}
