import { useController } from 'react-hook-form';
import { Switch, View } from 'react-native';

import {
  PickerField,
  type PickerFieldProps,
} from '@/components/ui/picker-field';
import { Text } from '@/components/ui/text';
import { TextField, type TextFieldProps } from '@/components/ui/text-field';
import palette from '@/config/palette.json';

// Campos ligados ao react-hook-form: exigem um <FormProvider> acima.
export function FormTextField({
  name,
  format,
  ...props
}: Omit<TextFieldProps, 'value' | 'onChangeText' | 'onBlur' | 'error'> & {
  name: string;
  /** Máscara aplicada a cada tecla (ex.: telefone). */
  format?: (value: string) => string;
}) {
  const { field, fieldState } = useController({ name });
  return (
    <TextField
      {...props}
      value={field.value ?? ''}
      onChangeText={(value) => field.onChange(format ? format(value) : value)}
      onBlur={field.onBlur}
      error={fieldState.error?.message}
    />
  );
}

export function FormPickerField({
  name,
  ...props
}: Omit<PickerFieldProps, 'value' | 'onChange' | 'error'> & { name: string }) {
  const { field, fieldState } = useController({ name });
  return (
    <PickerField
      {...props}
      value={field.value ?? ''}
      onChange={field.onChange}
      error={fieldState.error?.message}
    />
  );
}

export function FormSwitchField({
  name,
  label,
  hint,
}: {
  name: string;
  label: string;
  hint?: string;
}) {
  const { field } = useController({ name });
  return (
    <View className='flex-row items-center gap-3 rounded-card border border-border bg-card p-3'>
      <View className='flex-1 gap-0.5'>
        <Text variant='label'>{label}</Text>
        {hint && <Text variant='muted'>{hint}</Text>}
      </View>
      <Switch
        accessibilityLabel={label}
        value={Boolean(field.value)}
        onValueChange={field.onChange}
        trackColor={{ true: palette.colors.brand }}
      />
    </View>
  );
}
