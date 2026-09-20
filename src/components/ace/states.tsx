import { CircleAlert, Inbox, RotateCcw } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { ApiError } from '@/lib/api-client';

export function LoadingState({
  label = 'Preparando tudo para você…',
}: {
  label?: string;
}) {
  return (
    <View
      className='flex-1 items-center justify-center gap-3 bg-background p-6'
      accessible
      accessibilityRole='progressbar'
      accessibilityLabel={label}
    >
      <ActivityIndicator size='large' color={palette.colors.brand} />
      <Text variant='muted'>{label}</Text>
    </View>
  );
}

export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <View
      className='flex-row items-start gap-2 rounded-card bg-destructive-soft p-3'
      accessible
      accessibilityRole='alert'
    >
      <CircleAlert size={18} color={palette.colors.destructive} />
      <Text variant='error' className='flex-1'>
        {error instanceof ApiError
          ? error.message
          : 'Não foi possível concluir. Tente novamente.'}
      </Text>
    </View>
  );
}

export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <View
      className='flex-1 items-center justify-center gap-3 bg-background p-6'
      accessible
      accessibilityRole='alert'
    >
      <View className='h-14 w-14 items-center justify-center rounded-full bg-brand-muted'>
        <CircleAlert size={28} color={palette.colors.brand} />
      </View>
      <Text variant='subtitle' className='text-center'>
        Não conseguimos carregar
      </Text>
      <Text variant='muted' className='text-center'>
        {error instanceof ApiError
          ? error.message
          : 'Algo não saiu como esperado. Tente novamente.'}
      </Text>
      {retry && (
        <Button
          variant='secondary'
          label='Tentar novamente'
          icon={<RotateCcw size={16} color={palette.colors.brand} />}
          onPress={retry}
        />
      )}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <View className='items-center gap-2 rounded-panel border border-border bg-card p-6'>
      <View className='h-14 w-14 items-center justify-center rounded-full bg-brand-muted'>
        {icon ?? <Inbox size={28} color={palette.colors.brand} />}
      </View>
      <Text variant='subtitle' className='text-center'>
        {title}
      </Text>
      <Text variant='muted' className='text-center'>
        {description}
      </Text>
      {children}
    </View>
  );
}

export function SubmitButton({
  busy,
  label,
  busyLabel = 'Salvando…',
  onPress,
}: {
  busy: boolean;
  label: string;
  busyLabel?: string;
  onPress: () => void;
}) {
  return (
    <Button label={label} busy={busy} busyLabel={busyLabel} onPress={onPress} />
  );
}
