import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { cn } from '@/lib/utils';

import { Text } from './text';

export type ChipOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

/** Chip isolado (filtro rápido, aba de painel). */
export function Chip({
  label,
  active = false,
  icon,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  active?: boolean;
  icon?: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={cn(
        'h-9 flex-row items-center gap-1.5 rounded-pill border px-3',
        active ? 'border-brand bg-brand' : 'border-border bg-card',
      )}
    >
      {icon}
      <Text
        className={cn(
          'font-inter-medium text-sm',
          active ? 'text-white' : 'text-foreground',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Fileira rolável de chips com escolha única. `clearable` permite desmarcar
 * o ativo (volta a `undefined`); sem `clearable`, sempre há um selecionado.
 */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  clearable = true,
  label,
}: {
  options: ChipOption<T>[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  clearable?: boolean;
  label: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={label}
      accessibilityRole='radiogroup'
      contentContainerClassName='gap-2'
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Chip
            key={option.value}
            label={option.label}
            icon={option.icon}
            active={active}
            onPress={() =>
              onChange(active && clearable ? undefined : option.value)
            }
          />
        );
      })}
      <View className='w-3' />
    </ScrollView>
  );
}
