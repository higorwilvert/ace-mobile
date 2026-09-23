import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import palette from '@/config/palette.json';
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
  trailing,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  active?: boolean;
  icon?: ReactNode;
  /** Conteúdo depois do rótulo (ex.: o ✕ de um filtro ativo). */
  trailing?: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      // 36px de altura visual + 4px de folga em cima e embaixo = 44pt de alvo.
      hitSlop={{ top: 4, bottom: 4 }}
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
      {trailing}
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

export type ActiveChip = { key: string; label: string; onRemove: () => void };

/**
 * Resumo do que está filtrado. Cada chip é o botão que se remove, em um
 * toque, sem reabrir a folha. Quebra linha; nunca rola na horizontal.
 */
export function ActiveFilterChips({
  chips,
  onClear,
}: {
  chips: ActiveChip[];
  onClear: () => void;
}) {
  if (!chips.length) return null;
  return (
    <View
      className='flex-row flex-wrap gap-2'
      accessibilityRole='none'
      accessibilityLabel='Filtros ativos'
    >
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          label={chip.label}
          active
          accessibilityLabel={`Remover filtro ${chip.label}`}
          trailing={<X size={14} color='#fff' />}
          onPress={chip.onRemove}
        />
      ))}
      <Chip
        label='Limpar tudo'
        icon={<X size={14} color={palette.colors.brand} />}
        onPress={onClear}
      />
    </View>
  );
}
