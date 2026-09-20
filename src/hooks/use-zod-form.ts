import { zodResolver } from '@hookform/resolvers/zod';
import { type DefaultValues, useForm } from 'react-hook-form';
import type { z } from 'zod';

/** react-hook-form + Zod com valores de entrada/saída tipados pelo schema. */
export function useZodForm<Schema extends z.ZodTypeAny>(
  schema: Schema,
  defaultValues: DefaultValues<z.input<Schema>>,
) {
  return useForm<z.input<Schema>, unknown, z.output<Schema>>({
    defaultValues,
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });
}
