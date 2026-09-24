import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { formatWhen } from '@/features/matches/schemas';
import type { RatingChange } from '@/features/results/api';
import {
  ratingDelta,
  ratingDeltaLabel,
  ratingNumber,
} from '@/features/results/schemas';

/** Folha "Detalhes do processamento": valores antes/depois registrados pela API (T11). */
export function RatingChangeDetails({ change }: { change: RatingChange }) {
  const delta = ratingDelta(change);
  const rows: [string, string][] = [
    ['Rating registrado', `${change.ratingBefore} → ${change.ratingAfter}`],
    ['Desvio (RD)', `${change.rdBefore} → ${change.rdAfter}`],
    [
      'Volatilidade (σ)',
      `${change.volatilityBefore} → ${change.volatilityAfter}`,
    ],
    ['Versão do algoritmo', change.algorithmVersion],
    ['Processado em', formatWhen(change.processedAt)],
  ];
  return (
    <View className='gap-3 pb-2'>
      <Text variant='subtitle'>
        {`Rating ${ratingNumber(change.ratingBefore)} → ${ratingNumber(change.ratingAfter)}`}
      </Text>
      <Text
        className='font-inter-semibold text-base'
        style={{
          color:
            delta >= 0 ? palette.colors.success : palette.colors.destructive,
        }}
      >
        {`${ratingDeltaLabel(change)} pontos`}
      </Text>
      {rows.map(([label, value]) => (
        <View key={label} className='flex-row justify-between gap-3'>
          <Text variant='muted'>{label}</Text>
          <Text
            className='flex-1 text-right font-inter-medium text-sm'
            selectable
          >
            {value}
          </Text>
        </View>
      ))}
      <Text variant='muted'>
        Valores registrados pela API. A diferença exibida é o rating depois
        menos o rating antes da partida.
      </Text>
    </View>
  );
}
