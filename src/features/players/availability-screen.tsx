import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Lock, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { Alert, Pressable, View } from 'react-native';
import { toast } from 'sonner-native';

import { FormPickerField } from '@/components/ace/form-fields';
import {
  EmptyState,
  ErrorState,
  FormError,
  LoadingState,
  SubmitButton,
} from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { useZodForm } from '@/hooks/use-zod-form';
import { errorMessage } from '@/lib/api-client';
import type { Availability } from '@/types/api';

import { availabilityQuery, deleteAvailability, saveAvailability } from './api';
import {
  dayLabels,
  dayOptions,
  dayOrder,
  endTimeOptions,
  startTimeOptions,
  timeZoneOptions,
} from './labels';
import { availabilityFormSchema } from './schemas';

const windowLabel = (item: Availability) =>
  `${item.startTime} — ${item.endTime}`;

type Editing = { id?: string; dayOfWeek: number };

function WindowForm({
  existing,
  editing,
  onSaved,
}: {
  existing: Availability[];
  editing: Editing;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const current = existing.find((item) => item.id === editing.id);
  const others = existing.filter((item) => item.id !== editing.id);
  // A API exige um único fuso por jogador: só é editável sem outras janelas.
  const zoneLocked = others.length > 0;
  const form = useZodForm(availabilityFormSchema(existing, editing.id), {
    dayOfWeek: String(editing.dayOfWeek),
    startTime: current?.startTime ?? '',
    endTime: current?.endTime ?? '',
    timeZone: current?.timeZone ?? others[0]?.timeZone ?? 'America/Sao_Paulo',
  });
  const mutation = useMutation({
    mutationFn: (values: Parameters<typeof saveAvailability>[0]) =>
      saveAvailability(values, editing.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: availabilityQuery.queryKey,
      });
      toast.success(editing.id ? 'Horário atualizado.' : 'Horário adicionado.');
      onSaved();
    },
  });
  const submit = form.handleSubmit((values) => mutation.mutate(values));
  return (
    <FormProvider {...form}>
      <FormPickerField
        name='dayOfWeek'
        label='Dia da semana'
        options={dayOptions}
      />
      <View className='flex-row gap-3'>
        <View className='flex-1'>
          <FormPickerField
            name='startTime'
            label='Início'
            placeholder='--:--'
            options={startTimeOptions}
          />
        </View>
        <View className='flex-1'>
          <FormPickerField
            name='endTime'
            label='Fim'
            placeholder='--:--'
            options={endTimeOptions}
          />
        </View>
      </View>
      <FormPickerField
        name='timeZone'
        label='Fuso horário'
        options={timeZoneOptions}
        disabled={zoneLocked}
        hint={
          zoneLocked
            ? 'Para trocar o fuso, remova os outros horários.'
            : 'Todos os seus horários usam o mesmo fuso.'
        }
      />
      <FormError error={mutation.error} />
      <SubmitButton
        busy={mutation.isPending}
        label='Salvar horário'
        onPress={() => void submit()}
      />
    </FormProvider>
  );
}

export function AvailabilityScreen() {
  const queryClient = useQueryClient();
  const windows = useQuery(availabilityQuery);
  const [editing, setEditing] = useState<Editing | null>(null);
  const remove = useMutation({
    mutationFn: deleteAvailability,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: availabilityQuery.queryKey,
      });
      toast.success('Horário removido.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const confirmRemove = (item: Availability) =>
    Alert.alert(
      'Remover horário?',
      `${dayLabels[item.dayOfWeek]}, ${windowLabel(item)} deixa de contar para as recomendações.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => remove.mutate(item.id),
        },
      ],
    );

  if (windows.isPending) return <LoadingState />;
  if (windows.isError)
    return <ErrorState error={windows.error} retry={() => windows.refetch()} />;
  const data = windows.data;
  const zone = data[0]?.timeZone;
  return (
    <Screen scroll edges={['bottom']} className='gap-5 pt-4'>
      <View className='gap-1'>
        <Text variant='muted'>
          {data.length === 0
            ? 'Conte quando você costuma jogar.'
            : `${data.length} ${data.length === 1 ? 'horário' : 'horários'} · fuso ${
                timeZoneOptions.find((option) => option.value === zone)
                  ?.label ?? zone
              }`}
        </Text>
      </View>
      {data.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={28} color={palette.colors.brand} />}
          title='Sem horários ainda'
          description='Adicione os períodos em que você costuma jogar para receber recomendações no seu horário.'
        />
      ) : null}
      <View className='gap-3'>
        {dayOrder.map((day) => {
          const items = data
            .filter((item) => item.dayOfWeek === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          return (
            <View
              key={day}
              className='gap-2 rounded-panel border border-border bg-card p-4'
              accessibilityLabel={`Dia: ${dayLabels[day]}`}
            >
              <View className='flex-row items-center justify-between'>
                <Text
                  variant='label'
                  className={items.length === 0 ? 'text-muted-foreground' : ''}
                >
                  {dayLabels[day]}
                </Text>
                <Pressable
                  accessibilityRole='button'
                  accessibilityLabel={`Adicionar horário em ${dayLabels[day]}`}
                  hitSlop={8}
                  className='h-8 w-8 items-center justify-center rounded-full bg-brand-muted active:opacity-80'
                  onPress={() => setEditing({ dayOfWeek: day })}
                >
                  <Plus size={18} color={palette.colors.brand} />
                </Pressable>
              </View>
              {items.length === 0 ? (
                <Text variant='muted'>—</Text>
              ) : (
                <View className='flex-row flex-wrap gap-2'>
                  {items.map((item) => (
                    <View
                      key={item.id}
                      className='flex-row items-center gap-2 rounded-pill bg-brand-light py-1.5 pl-3 pr-2'
                    >
                      <Text className='font-inter-medium text-sm text-brand'>
                        {windowLabel(item)}
                      </Text>
                      <Pressable
                        accessibilityRole='button'
                        accessibilityLabel={`Editar ${windowLabel(item)}`}
                        hitSlop={6}
                        onPress={() =>
                          setEditing({ id: item.id, dayOfWeek: item.dayOfWeek })
                        }
                      >
                        <Pencil size={14} color={palette.colors.brand} />
                      </Pressable>
                      <Pressable
                        accessibilityRole='button'
                        accessibilityLabel={`Excluir ${windowLabel(item)}`}
                        hitSlop={6}
                        onPress={() => confirmRemove(item)}
                      >
                        <Trash2 size={14} color={palette.colors.destructive} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
      <Button
        label='Adicionar horário'
        icon={<Plus size={18} color='#ffffff' />}
        onPress={() => setEditing({ dayOfWeek: 1 })}
      />
      <View className='flex-row items-start gap-2'>
        <Lock size={16} color={palette.colors['muted-foreground']} />
        <Text variant='muted' className='flex-1'>
          Sua disponibilidade é privada e não aparece no seu perfil público.
        </Text>
      </View>
      <Sheet
        visible={editing !== null}
        title={editing?.id ? 'Editar horário' : 'Novo horário'}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <WindowForm
            existing={data}
            editing={editing}
            onSaved={() => setEditing(null)}
          />
        )}
      </Sheet>
    </Screen>
  );
}
