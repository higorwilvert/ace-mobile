import { Trophy } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { SportIcon } from '@/components/ace/sport-icon';
import { EmptyState } from '@/components/ace/states';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { cn } from '@/lib/utils';

import type { SportTotals } from './api';

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Text variant='muted'>
      <Text className='font-inter-semibold text-sm text-foreground'>
        {String(value)}
      </Text>
      {` ${label}`}
    </Text>
  );
}

/**
 * Totais por modalidade (RF25), derivados da mesma consulta do histórico.
 * Com `onPick`, cada tile vira um filtro (tocar na ativa limpa).
 */
export function TotalsTiles({
  totals,
  active,
  onPick,
  emptyTitle = 'Nenhuma partida registrada ainda',
  emptyDescription = 'Os totais aparecem assim que um resultado for registrado.',
}: {
  totals: SportTotals[];
  active?: number;
  onPick?: (sportId: number | undefined) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!totals.length)
    return (
      <EmptyState
        icon={<Trophy size={28} color={palette.colors.brand} />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  return (
    <View
      className='flex-row flex-wrap gap-2'
      accessibilityLabel='Totais por modalidade'
    >
      {totals.map((t) => {
        const selected = active === t.sportId;
        return (
          <Pressable
            key={t.sportId}
            accessibilityRole={onPick ? 'button' : 'summary'}
            accessibilityLabel={`${t.sport.name}: ${plural(t.matches, 'partida', 'partidas')}, ${t.wins} vitórias, ${t.losses} derrotas, ${t.draws} empates`}
            accessibilityState={onPick ? { selected } : undefined}
            disabled={!onPick}
            onPress={() => onPick?.(selected ? undefined : t.sportId)}
            className={cn(
              'w-[48%] flex-grow gap-2 rounded-panel border bg-card p-3',
              selected ? 'border-brand bg-brand-muted' : 'border-border',
              onPick && 'active:bg-brand-muted',
            )}
          >
            <View className='flex-row items-center gap-2'>
              <SportIcon slug={t.sport.slug} size={24} />
              <Text variant='label' numberOfLines={1} className='flex-1'>
                {t.sport.name}
              </Text>
            </View>
            <Text className='font-inter-bold text-xl'>
              {plural(t.matches, 'partida', 'partidas')}
            </Text>
            <View className='gap-0.5'>
              <Stat
                value={t.wins}
                label={t.wins === 1 ? 'vitória' : 'vitórias'}
              />
              <Stat
                value={t.losses}
                label={t.losses === 1 ? 'derrota' : 'derrotas'}
              />
              <Stat
                value={t.draws}
                label={t.draws === 1 ? 'empate' : 'empates'}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
