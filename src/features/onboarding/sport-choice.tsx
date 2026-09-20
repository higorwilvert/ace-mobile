import { useQuery } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';

import { SportIcon, sportColors } from '@/components/ace/sport-icon';
import { ErrorState, LoadingState } from '@/components/ace/states';
import { Text } from '@/components/ui/text';
import { sportsQuery } from '@/features/players/api';
import { formatLabel } from '@/features/players/labels';
import { cn } from '@/lib/utils';
import type { Sport } from '@/types/api';

/** Grade de modalidades com escolha única (etapa 4). */
export function SportChoice({
  selected,
  onSelect,
}: {
  selected: Sport | null;
  onSelect: (sport: Sport) => void;
}) {
  const sports = useQuery(sportsQuery);
  if (sports.isPending) return <LoadingState label='Carregando modalidades…' />;
  if (sports.isError)
    return <ErrorState error={sports.error} retry={() => sports.refetch()} />;
  return (
    <View className='gap-3' accessibilityRole='radiogroup'>
      {sports.data.map((sport) => {
        const active = selected?.id === sport.id;
        return (
          <Pressable
            key={sport.id}
            accessibilityRole='radio'
            accessibilityState={{ selected: active, checked: active }}
            onPress={() => onSelect(sport)}
            className={cn(
              'flex-row items-center gap-4 rounded-panel border bg-card p-4 active:opacity-80',
              active ? 'border-brand' : 'border-border',
            )}
            style={
              active
                ? { backgroundColor: sportColors(sport.slug).bg }
                : undefined
            }
          >
            <SportIcon slug={sport.slug} />
            <View className='flex-1 gap-0.5'>
              <Text variant='subtitle'>{sport.name}</Text>
              <Text variant='muted'>{formatLabel(sport)}</Text>
            </View>
            <View
              className={cn(
                'h-5 w-5 items-center justify-center rounded-full border-2',
                active ? 'border-brand' : 'border-input',
              )}
            >
              {active && <View className='h-2.5 w-2.5 rounded-full bg-brand' />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
