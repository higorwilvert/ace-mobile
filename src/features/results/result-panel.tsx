import { Trophy } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import type { MatchDetail } from '@/features/matches/api';
import { formatWhen, teamIndexes } from '@/features/matches/schemas';
import { cn } from '@/lib/utils';

import { describeOutcome, scoreline, teamName, teamPlayers } from './schemas';

/**
 * Placar final no detalhe da partida (`COMPLETED`): desfecho, scoreline,
 * grade set a set, quem registrou e a situação do rating (T11 preenche
 * `ratingsProcessedAt`).
 */
export function ResultPanel({ match }: { match: MatchDetail }) {
  const result = match.result;
  if (!result) return null;
  const outcome = {
    setsWon: result.setsWon,
    winnerTeamIndex: result.winnerTeamIndex,
    isDraw: result.isDraw,
  };
  const muted = palette.colors['muted-foreground'];
  return (
    <View
      className='gap-3 rounded-panel border border-border bg-card p-4'
      accessibilityLabel='Placar final'
    >
      <View className='flex-row items-start gap-3'>
        <View className='flex-1 gap-0.5'>
          <Text className='font-inter-semibold text-xs uppercase tracking-widest text-brand'>
            Placar final
          </Text>
          <Text variant='subtitle'>
            {describeOutcome(outcome, (index) => teamName(match, index))}
          </Text>
        </View>
        <Trophy size={24} color={palette.colors.brand} />
      </View>
      <Text className='font-inter-bold text-2xl tracking-tight'>
        {scoreline(
          result.sets.map((set) => ({
            a: set.team1,
            b: set.team2,
            tiebreak: set.tiebreak
              ? { a: set.tiebreak.team1, b: set.tiebreak.team2 }
              : null,
          })),
        )}
      </Text>

      <View className='overflow-hidden rounded-card border border-border'>
        <View className='flex-row items-center bg-muted px-3 py-2'>
          <Text className='flex-1 text-xs uppercase tracking-wider text-muted-foreground'>
            Time
          </Text>
          {result.sets.map((set) => (
            <Text
              key={set.setNumber}
              className='w-11 text-center text-xs uppercase tracking-wider text-muted-foreground'
            >
              {`Set ${set.setNumber}`}
            </Text>
          ))}
          <Text className='w-11 text-center text-xs uppercase tracking-wider text-muted-foreground'>
            Sets
          </Text>
        </View>
        {teamIndexes.map((index) => {
          const key = index === 1 ? 'team1' : 'team2';
          const winner = result.winnerTeamIndex === index;
          return (
            <View
              key={index}
              className={cn(
                'flex-row items-center border-t border-border px-3 py-2',
                winner && 'bg-[#e3f3ea]',
              )}
            >
              <View className='flex-1 gap-0.5 pr-2'>
                <View className='flex-row items-center gap-1.5'>
                  <Text variant='label'>{`Time ${index}`}</Text>
                  {winner && (
                    <View
                      accessibilityRole='image'
                      accessibilityLabel='Vencedor'
                    >
                      <Trophy size={13} color={palette.colors.success} />
                    </View>
                  )}
                </View>
                <Text variant='muted' numberOfLines={2}>
                  {teamPlayers(match, index).join(' e ') || '—'}
                </Text>
              </View>
              {result.sets.map((set) => (
                <View key={set.setNumber} className='w-11 items-center'>
                  <Text className='font-inter-bold text-base'>
                    {String(set[key])}
                  </Text>
                  {set.tiebreak && (
                    <Text className='text-[10px] text-muted-foreground'>
                      {`(${set.tiebreak[key]})`}
                    </Text>
                  )}
                </View>
              ))}
              <Text className='w-11 text-center font-inter-bold text-base'>
                {String(result.setsWon[key])}
              </Text>
            </View>
          );
        })}
      </View>

      {result.notes && <Text>{result.notes}</Text>}
      <Text variant='muted'>
        {`Registrado por ${result.recordedBy.fullName} · ${formatWhen(result.recordedAt)}`}
      </Text>
      <View className='flex-row items-start gap-2 rounded-card bg-muted px-3 py-2'>
        <Trophy size={14} color={muted} style={{ marginTop: 2 }} />
        <Text variant='muted' className='flex-1'>
          {result.ratingsProcessedAt
            ? `Rating Glicko-2 atualizado em ${formatWhen(result.ratingsProcessedAt)}.`
            : 'O rating Glicko-2 desta partida ainda não foi processado.'}
        </Text>
      </View>
    </View>
  );
}
