import { useRouter } from 'expo-router';
import { CalendarDays, Check, MapPin, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { applyToMatch } from '@/features/matches/api';
import { Fact } from '@/features/matches/match-card';
import {
  durationLabel,
  formatLabel,
  formatShort,
  formatWhen,
} from '@/features/matches/schemas';
import { useMatchMutation } from '@/features/matches/use-match-mutation';
import { categoryRange, policyLabels } from '@/features/players/labels';
import type { Sport } from '@/types/api';

import type { RecommendationMeta, RecommendedMatch } from './api';
import { ScoreDetails, ScoreHeader } from './score-details';

/**
 * Partida recomendada (RF27): quando, onde, vaga e time sugerido. A
 * candidatura envia exatamente `suggestedTeamIndex`; a sugestão não reserva
 * vaga — lotação, conflito e composição são verificados de novo pela API.
 */
export function MatchSuggestion({
  item,
  meta,
  sport,
}: {
  item: RecommendedMatch;
  meta: RecommendationMeta;
  sport: Sport;
}) {
  const router = useRouter();
  const [applied, setApplied] = useState(false);
  const m = item.match;
  const title = m.title ?? `${sport.name} · ${formatShort(m.teamSize)}`;
  const apply = useMatchMutation(
    () => applyToMatch(m.id, { teamIndex: item.suggestedTeamIndex }),
    {
      success: 'Candidatura enviada. Aguarde a aprovação.',
      onSuccess: () => setApplied(true),
    },
  );
  const confirm = () =>
    Alert.alert(
      `Participar de ${title}?`,
      `Sua candidatura será enviada para o Time ${item.suggestedTeamIndex}. A vaga depende da aprovação de quem organiza e será verificada novamente no envio.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Candidatar-me', onPress: () => apply.mutate(undefined) },
      ],
    );
  const muted = palette.colors['muted-foreground'];
  const seats = `${m.capacity.available} ${m.capacity.available === 1 ? 'vaga' : 'vagas'} · Time ${item.suggestedTeamIndex} sugerido`;
  return (
    <View className='gap-4 rounded-panel border border-border bg-card p-4'>
      <View className='flex-row items-start gap-3'>
        <View className='flex-1 gap-0.5'>
          <Text variant='muted'>
            {`${sport.name} · ${policyLabels[m.genderPolicy]}`}
          </Text>
          <Pressable
            accessibilityRole='link'
            accessibilityLabel={`Ver partida ${title}`}
            hitSlop={4}
            onPress={() => router.push(`/matches/${m.id}`)}
          >
            <Text variant='subtitle' numberOfLines={2}>
              {title}
            </Text>
          </Pressable>
        </View>
      </View>
      <View className='gap-1.5'>
        <Fact
          icon={<CalendarDays size={14} color={muted} />}
          text={`${formatWhen(m.scheduledAt)} · ${durationLabel(m.durationMinutes)}`}
        />
        <Fact
          icon={<MapPin size={14} color={muted} />}
          text={`${m.locationText ?? 'Ver local na partida'} · ${m.city}, ${m.state}`}
        />
        <Fact icon={<Users size={14} color={muted} />} text={seats} />
        <Text variant='muted'>
          {`${formatLabel(m.teamSize)} · ${categoryRange(sport, m.minCategoryCode, m.maxCategoryCode)}`}
        </Text>
        {(m.minRating !== null || m.maxRating !== null) && (
          <Text variant='muted'>
            {`Rating ACE: ${m.minRating ?? 'sem mínimo'} a ${m.maxRating ?? 'sem máximo'}`}
          </Text>
        )}
      </View>
      <ScoreHeader item={item} meta={meta} />
      {applied ? (
        <View
          className='h-12 flex-row items-center justify-center gap-2 rounded-control'
          style={{ backgroundColor: '#e3f3ea' }}
        >
          <Check size={16} color={palette.colors.success} />
          <Text
            className='font-inter-semibold text-base'
            style={{ color: palette.colors.success }}
          >
            Candidatura enviada
          </Text>
        </View>
      ) : (
        <Button
          label='Candidatar-me'
          busy={apply.isPending}
          busyLabel='Enviando…'
          onPress={confirm}
        />
      )}
      <ScoreDetails item={item} meta={meta} />
    </View>
  );
}
