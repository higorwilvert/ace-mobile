import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, type TextInputProps, View } from 'react-native';

import palette from '@/config/palette.json';
import { cn } from '@/lib/utils';

import { Text } from './text';

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  /** Campo de senha com botão para mostrar/ocultar. */
  secure?: boolean;
};

export function TextField({
  label,
  error,
  hint,
  secure = false,
  editable = true,
  multiline = false,
  className,
  style,
  ...props
}: TextFieldProps) {
  const [hidden, setHidden] = useState(secure);
  return (
    <View className='gap-1.5'>
      <Text variant='label'>{label}</Text>
      <View
        className={cn(
          'flex-row rounded-control border bg-card px-3',
          multiline ? 'items-start' : 'h-12 items-center',
          error ? 'border-destructive' : 'border-input',
          !editable && 'opacity-60',
        )}
        style={multiline ? { minHeight: 112, paddingVertical: 10 } : undefined}
      >
        {/*
          Sem classe de texto aqui de propósito: `text-base` traz `lineHeight`,
          e `lineHeight` num TextInput do iOS corta ascendentes/descendentes.
          Tamanho e cor vão inline; o multilinha cresce com o conteúdo.
        */}
        <TextInput
          accessibilityLabel={label}
          className={cn('flex-1 font-inter', className)}
          style={[
            {
              fontSize: 16,
              color: palette.colors.foreground,
              paddingVertical: 0,
              paddingHorizontal: 0,
              includeFontPadding: false,
            },
            multiline ? { minHeight: 92, paddingTop: 0 } : { height: 46 },
            style,
          ]}
          placeholderTextColor={palette.colors['muted-foreground']}
          secureTextEntry={hidden}
          editable={editable}
          multiline={multiline}
          scrollEnabled={!multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...props}
        />
        {secure && (
          <Pressable
            accessibilityRole='button'
            accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}
            hitSlop={8}
            onPress={() => setHidden((value) => !value)}
          >
            {hidden ? (
              <Eye size={20} color={palette.colors['muted-foreground']} />
            ) : (
              <EyeOff size={20} color={palette.colors['muted-foreground']} />
            )}
          </Pressable>
        )}
      </View>
      {error ? (
        <Text variant='error' accessibilityRole='alert'>
          {error}
        </Text>
      ) : hint ? (
        <Text variant='muted'>{hint}</Text>
      ) : null}
    </View>
  );
}
