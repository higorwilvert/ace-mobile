import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import palette from '@/config/palette.json';
import { cn } from '@/lib/utils';

import { Text } from './text';

export type PickerOption = { value: string; label: string };
export type PickerFieldProps = {
  label: string;
  value: string;
  options: PickerOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  loading?: boolean;
  /** Mostra campo de busca (listas longas, como cidades). */
  searchable?: boolean;
  /** Filtro customizado (ex.: tolerante a acentos). Padrão: includes sem caixa. */
  filter?: (option: PickerOption, search: string) => boolean;
  emptyLabel?: string;
};

const defaultFilter = (option: PickerOption, search: string) =>
  option.label
    .toLocaleLowerCase('pt-BR')
    .includes(search.trim().toLocaleLowerCase('pt-BR'));

export function PickerField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Selecione',
  error,
  hint,
  disabled = false,
  loading = false,
  searchable = false,
  filter = defaultFilter,
  emptyLabel = 'Nenhuma opção encontrada',
}: PickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();
  const selected = options.find((option) => option.value === value);
  const visible = useMemo(
    () =>
      search.trim()
        ? options.filter((option) => filter(option, search))
        : options,
    [options, search, filter],
  );
  const close = () => {
    setOpen(false);
    setSearch('');
  };
  return (
    <View className='gap-1.5'>
      <Text variant='label'>{label}</Text>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={label}
        accessibilityState={{ disabled: disabled || loading, expanded: open }}
        disabled={disabled || loading}
        onPress={() => setOpen(true)}
        className={cn(
          'h-12 flex-row items-center justify-between rounded-control border bg-card px-3',
          error ? 'border-destructive' : 'border-input',
          disabled && 'opacity-60',
        )}
      >
        <Text
          className={cn('flex-1', !selected && 'text-muted-foreground')}
          numberOfLines={1}
        >
          {/* Valor ainda sem opção carregada (cidade antes da lista) segue visível. */}
          {selected?.label ?? (value || placeholder)}
        </Text>
        {loading ? (
          <ActivityIndicator color={palette.colors.brand} />
        ) : (
          <ChevronDown size={20} color={palette.colors['muted-foreground']} />
        )}
      </Pressable>
      {error ? (
        <Text variant='error' accessibilityRole='alert'>
          {error}
        </Text>
      ) : hint ? (
        <Text variant='muted'>{hint}</Text>
      ) : null}
      <Modal visible={open} animationType='slide' onRequestClose={close}>
        <View
          className='flex-1 bg-background'
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          <View className='flex-row items-center justify-between border-b border-border px-4 py-3'>
            <Text variant='subtitle'>{label}</Text>
            <Pressable
              accessibilityRole='button'
              accessibilityLabel='Fechar'
              hitSlop={8}
              onPress={close}
            >
              <X size={22} color={palette.colors.foreground} />
            </Pressable>
          </View>
          {searchable && (
            <View className='m-4 h-12 flex-row items-center gap-2 rounded-control border border-input bg-card px-3'>
              <Search size={18} color={palette.colors['muted-foreground']} />
              <TextInput
                accessibilityLabel={`Buscar ${label.toLocaleLowerCase('pt-BR')}`}
                className='flex-1 font-inter'
                style={{
                  fontSize: 16,
                  color: palette.colors.foreground,
                  paddingVertical: 0,
                }}
                placeholder='Buscar'
                placeholderTextColor={palette.colors['muted-foreground']}
                value={search}
                onChangeText={setSearch}
                autoFocus
                autoCorrect={false}
              />
            </View>
          )}
          <FlatList
            data={visible}
            keyExtractor={(option) => option.value}
            keyboardShouldPersistTaps='handled'
            // Listas curtas (UFs, gênero) aparecem inteiras; as longas
            // (cidades) continuam virtualizadas.
            initialNumToRender={30}
            ListEmptyComponent={
              <Text variant='muted' className='p-4 text-center'>
                {emptyLabel}
              </Text>
            }
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <Pressable
                  accessibilityRole='button'
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    onChange(item.value);
                    close();
                  }}
                  className='flex-row items-center justify-between border-b border-border px-4 py-3 active:bg-brand-muted'
                >
                  <Text
                    className={cn(active && 'font-inter-semibold text-brand')}
                  >
                    {item.label}
                  </Text>
                  {active && <Check size={18} color={palette.colors.brand} />}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}
