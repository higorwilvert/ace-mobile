import { useRouter } from 'expo-router';
import { CalendarDays, MapPin } from 'lucide-react-native';
import { Fragment } from 'react';
import { Pressable, View } from 'react-native';

import { SportIcon } from '@/components/ace/sport-icon';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { Badge } from '@/features/matches/match-card';
import {
  formatShort,
  formatWhen,
  matchTitle,
  placeLabel,
} from '@/features/matches/schemas';
import type { PublicUser } from '@/types/api';

import type { HistoryEntry, Outcome, RatingChange } from './api';
import {
  outcomeLabels,
  ratingDelta,
  ratingDeltaLabel,
  scoreline,
} from './schemas';

const outcomeTone = {
  WIN: 'success',
  LOSS: 'danger',
  DRAW: 'neutral',
} as const;
const outcomeInk: Record<Outcome, string> = {
  WIN: palette.colors.success,
  LOSS: palette.colors.destructive,
  DRAW: palette.colors['muted-foreground'],
};

function People({ label, users }: { label: string; users: PublicUser[] }) {
  const router = useRouter();
  if (!users.length) return null;
  return (
    <Text variant='muted'>
      {`${label} `}
      {users.map((u, i) => (
        <Fragment key={u.id}>
          {i > 0 && (i === users.length - 1 ? ' e ' : ', ')}
          <Text
            className='font-inter-medium text-sm text-brand'
            accessibilityRole='link'
            onPress={() => router.push(`/players/${u.id}`)}
          >
            {u.fullName}
          </Text>
        </Fragment>
      ))}
    </Text>
  );
}

/**
 * Item do histórico na perspectiva do jogador (RF24): modalidade, data,
 * adversários, placar, desfecho e, quando processada, a variação do rating.
 */
export function HistoryEntryCard({
  entry,
  showRating = true,
  onRatingPress,
}: {
  entry: HistoryEntry;
  showRating?: boolean;
  /** Com handler, a variação vira um botão (T32: detalhes do processamento). */
  onRatingPress?: (change: RatingChange) => void;
}) {
  const router = useRouter();
  const { match } = entry;
  const score = scoreline(
    entry.sets.map((set) => ({
      a: set.own,
      b: set.opponent,
      tiebreak: set.tiebreak
        ? { a: set.tiebreak.own, b: set.tiebreak.opponent }
        : null,
    })),
  );
  const change = showRating ? entry.ratingChange : null;
  const delta = change ? ratingDelta(change) : 0;
  const muted = palette.colors['muted-foreground'];
  return (
    <View
      className='flex-row gap-3 rounded-panel border border-border bg-card p-4'
      style={{ borderLeftWidth: 4, borderLeftColor: outcomeInk[entry.outcome] }}
    >
      <SportIcon slug={match.sport.slug} size={36} />
      <View className='flex-1 gap-1.5'>
        <Text className='font-inter-semibold text-[11px] uppercase tracking-widest text-muted-foreground'>
          {`${match.sport.name} · ${formatShort(match.teamSize)}`}
        </Text>
        <Pressable
          accessibilityRole='link'
          accessibilityLabel={`Abrir ${matchTitle(match)}`}
          hitSlop={4}
          onPress={() => router.push(`/matches/${match.id}`)}
        >
          <Text variant='label' className='text-brand' numberOfLines={2}>
            {matchTitle(match)}
          </Text>
        </Pressable>
        <View className='flex-row flex-wrap items-center gap-2'>
          <Badge
            label={outcomeLabels[entry.outcome]}
            tone={outcomeTone[entry.outcome]}
          />
          <Text variant='muted'>{`${entry.setsWon}–${entry.setsLost} em sets`}</Text>
          <Text className='font-inter-semibold text-sm'>{score}</Text>
        </View>
        <View className='flex-row items-center gap-1.5'>
          <CalendarDays size={13} color={muted} />
          <Text variant='muted'>{formatWhen(match.scheduledAt)}</Text>
        </View>
        <View className='flex-row items-center gap-1.5'>
          <MapPin size={13} color={muted} />
          <Text variant='muted' numberOfLines={1} className='flex-1'>
            {`${placeLabel(match)} · ${match.city}, ${match.state}`}
          </Text>
        </View>
        {change && (
          <Pressable
            accessibilityRole={onRatingPress ? 'button' : undefined}
            accessibilityHint={
              onRatingPress ? 'Abre os detalhes do processamento' : undefined
            }
            disabled={!onRatingPress}
            className='flex-row items-center gap-2'
            onPress={() => onRatingPress?.(change)}
          >
            <View
              className='rounded-pill px-2 py-0.5'
              style={{
                backgroundColor:
                  delta >= 0 ? '#e3f3ea' : palette.colors['destructive-soft'],
              }}
              accessibilityLabel={`Rating ${ratingDeltaLabel(change)}`}
            >
              <Text
                className='font-inter-bold text-xs'
                style={{
                  color:
                    delta >= 0
                      ? palette.colors.success
                      : palette.colors.destructive,
                }}
              >
                {ratingDeltaLabel(change)}
              </Text>
            </View>
            <Text variant='muted'>{`rating ${Math.round(change.ratingBefore)} → ${Math.round(change.ratingAfter)}`}</Text>
          </Pressable>
        )}
        <People label='com' users={entry.teammates} />
        <People label='contra' users={entry.opponents} />
      </View>
    </View>
  );
}
