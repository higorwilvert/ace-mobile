import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { FormProvider, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import {
  FormPickerField,
  FormSwitchField,
  FormTextField,
} from '@/components/ace/form-fields';
import { FormError, SubmitButton } from '@/components/ace/states';
import { useZodForm } from '@/hooks/use-zod-form';
import type { PlayerProfile, Sport } from '@/types/api';

import { profilesQuery, savePlayerProfile } from './api';
import { categoryOptions, sideOptions } from './labels';
import {
  profileFormSchema,
  profilePayload,
  type ProfileValues,
} from './schemas';

/**
 * Corpo do formulário de perfil esportivo, usado na etapa 5 do onboarding e
 * em "Meus esportes". A modalidade trava na edição (a API não troca `sportId`)
 * e quando vem fixada de fora.
 */
export function SportForm({
  sports,
  profile,
  fixedSportId,
  forcePrincipal = false,
  submitLabel = 'Salvar',
  onSaved,
}: {
  sports: Sport[];
  profile?: PlayerProfile;
  fixedSportId?: number;
  /** Primeiro perfil: vai como principal sem perguntar. */
  forcePrincipal?: boolean;
  submitLabel?: string;
  onSaved: (saved: PlayerProfile) => void;
}) {
  const queryClient = useQueryClient();
  const lockedSportId = profile?.sportId ?? fixedSportId;
  const form = useZodForm(profileFormSchema(sports), {
    sportId: lockedSportId ? String(lockedSportId) : '',
    categoryCode: profile?.categoryCode ?? '',
    preferredSide: profile?.preferredSide ?? '',
    yearsPracticing: profile?.yearsPracticing?.toString() ?? '',
    playFrequencyWeek: profile?.playFrequencyWeek?.toString() ?? '',
    isPrincipal: forcePrincipal || (profile?.isPrincipal ?? false),
  });
  const sportId = useWatch({ control: form.control, name: 'sportId' });
  const sport = sports.find((item) => String(item.id) === String(sportId));
  // Trocar de modalidade invalida categoria e lado escolhidos.
  useEffect(() => {
    form.resetField('categoryCode');
    form.resetField('preferredSide');
  }, [sportId, form]);
  const mutation = useMutation({
    mutationFn: (values: ProfileValues) => {
      const chosen = sports.find((item) => item.id === values.sportId);
      if (!chosen) throw new Error('Modalidade inválida');
      return savePlayerProfile(
        profilePayload(values, chosen, Boolean(profile)),
        profile?.id,
      );
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: profilesQuery.queryKey });
      onSaved(saved);
    },
  });
  const submit = form.handleSubmit((values) => mutation.mutate(values));
  return (
    <FormProvider {...form}>
      <View className='gap-4'>
        <FormPickerField
          name='sportId'
          label='Modalidade'
          placeholder='Escolha a modalidade'
          options={sports.map((item) => ({
            value: String(item.id),
            label: item.name,
          }))}
          disabled={lockedSportId !== undefined}
          hint={profile ? 'A modalidade não muda depois de criada.' : undefined}
        />
        <FormPickerField
          name='categoryCode'
          label='Categoria'
          placeholder={
            sport ? 'Escolha a categoria' : 'Escolha a modalidade primeiro'
          }
          options={categoryOptions(sport)}
          disabled={!sport}
          hint='Sua categoria define o rating inicial e as recomendações.'
        />
        {sport?.requiresSidePreference && (
          <FormPickerField
            name='preferredSide'
            label='Lado preferido'
            placeholder='Em que lado você joga?'
            options={sideOptions}
          />
        )}
        <FormTextField
          name='yearsPracticing'
          label='Tempo de prática (anos)'
          placeholder='Ex.: 3'
          keyboardType='number-pad'
          maxLength={5}
        />
        <FormTextField
          name='playFrequencyWeek'
          label='Vezes por semana'
          placeholder='Ex.: 2'
          keyboardType='number-pad'
          maxLength={2}
        />
        {!forcePrincipal && (
          <FormSwitchField
            name='isPrincipal'
            label='Perfil principal'
            hint='O esporte que aparece em destaque no seu perfil.'
          />
        )}
        <FormError error={mutation.error} />
        <SubmitButton
          busy={mutation.isPending}
          label={submitLabel}
          onPress={() => void submit()}
        />
      </View>
    </FormProvider>
  );
}
