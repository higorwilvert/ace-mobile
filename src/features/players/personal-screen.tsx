import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { FormProvider, useWatch } from 'react-hook-form';
import { View } from 'react-native';
import { toast } from 'sonner-native';

import { FormPickerField, FormTextField } from '@/components/ace/form-fields';
import { FormError, SubmitButton } from '@/components/ace/states';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { authQueryOptions } from '@/features/auth/api';
import { useSession } from '@/features/auth/session';
import { useZodForm } from '@/hooks/use-zod-form';
import { citiesQuery, isUf, matchesCity, UFS } from '@/lib/locations';
import { formatPhone } from '@/lib/utils';
import type { User } from '@/types/api';

import { updateUser } from './api';
import { AvatarPicker } from './avatar-picker';
import { genderOptions, handOptions } from './labels';
import { personalSchema } from './schemas';

const ufOptions = UFS.map((uf) => ({ value: uf, label: uf }));

function PersonalForm({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const form = useZodForm(personalSchema, {
    fullName: user.fullName,
    gender: user.gender ?? '',
    state: user.state,
    city: user.city,
    phone: user.phone ?? '',
    bio: user.bio ?? '',
    dominantHand: user.dominantHand ?? '',
  });
  const [state, bio] = useWatch({
    control: form.control,
    name: ['state', 'bio'],
  });
  const cities = useQuery(citiesQuery(state));
  // Trocar de estado invalida a cidade escolhida (a atual segue válida).
  useEffect(() => {
    if (state !== user.state) form.resetField('city', { defaultValue: '' });
  }, [state, user.state, form]);
  const mutation = useMutation({
    mutationFn: updateUser,
    onSuccess: (updated) => {
      queryClient.setQueryData(authQueryOptions.queryKey, updated);
      form.reset(undefined, { keepValues: true });
      toast.success('Dados atualizados.');
    },
  });
  const submit = form.handleSubmit((values) => mutation.mutate(values));
  const cityOptions = (cities.data ?? []).map((city) => ({
    value: city,
    label: city,
  }));
  return (
    <FormProvider {...form}>
      <AvatarPicker user={user} />
      <View className='gap-4'>
        <FormTextField
          name='fullName'
          label='Nome completo'
          autoComplete='name'
          textContentType='name'
          maxLength={150}
        />
        <View className='gap-1.5'>
          <Text variant='label'>E-mail</Text>
          <View className='h-12 justify-center rounded-control border border-border bg-muted px-3'>
            <Text className='text-muted-foreground'>{user.email}</Text>
          </View>
          <Text variant='muted'>
            O e-mail de acesso não pode ser alterado por aqui.
          </Text>
        </View>
        <FormPickerField
          name='gender'
          label='Gênero'
          placeholder='Selecione uma opção'
          options={genderOptions}
          hint='Usado para respeitar a composição dos jogos. Não aparece no seu perfil público.'
        />
        <FormPickerField
          name='state'
          label='Estado'
          placeholder='UF'
          options={ufOptions}
        />
        <FormPickerField
          name='city'
          label='Cidade'
          placeholder={
            isUf(state) ? 'Escolha a cidade' : 'Escolha o estado primeiro'
          }
          options={cityOptions}
          searchable
          filter={(option, search) => matchesCity(option.label, search)}
          loading={cities.isFetching}
          disabled={!isUf(state)}
          hint={
            cities.isError
              ? 'Não foi possível carregar as cidades. Tente novamente.'
              : undefined
          }
        />
        <FormTextField
          name='phone'
          label='Telefone'
          placeholder='(48) 99999-0000'
          keyboardType='phone-pad'
          format={formatPhone}
          autoComplete='tel'
          maxLength={16}
        />
        <FormTextField
          name='bio'
          label='Bio'
          placeholder='Conte em poucas palavras como você joga.'
          multiline
          maxLength={1000}
          hint={`${(bio ?? '').length}/1000`}
        />
        <FormPickerField
          name='dominantHand'
          label='Mão dominante'
          placeholder='Selecione'
          options={handOptions}
        />
        <FormError error={mutation.error} />
        <SubmitButton
          busy={mutation.isPending}
          label='Salvar alterações'
          onPress={() => void submit()}
        />
      </View>
    </FormProvider>
  );
}

export function PersonalScreen() {
  const { user } = useSession();
  if (!user) return null;
  return (
    <Screen scroll edges={['bottom']} className='gap-6 pt-4'>
      <PersonalForm user={user} />
    </Screen>
  );
}
