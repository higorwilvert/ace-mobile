import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FormProvider, useWatch } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { FormPickerField, FormTextField } from '@/components/ace/form-fields';
import { SlantShell } from '@/components/ace/slant-shell';
import { FormError, SubmitButton } from '@/components/ace/states';
import { StepProgress } from '@/components/ace/step-progress';
import { StepTransition } from '@/components/ace/step-transition';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { useZodForm } from '@/hooks/use-zod-form';
import { citiesQuery, isUf, matchesCity, UFS } from '@/lib/locations';

import {
  accountSchema,
  login,
  personalStepSchema,
  register,
  type RegisterValues,
} from './api';
import { useSession } from './session';

const genderOptions = [
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Feminino' },
  { value: 'NON_BINARY', label: 'Não binário' },
  { value: 'NOT_SPECIFIED', label: 'Prefiro não informar' },
];
const ufOptions = UFS.map((uf) => ({ value: uf, label: uf }));

// Etapas 1 e 2 do assistente de cinco; as demais seguem no onboarding.
const TOTAL_STEPS = 5;

export function RegisterScreen() {
  const { signIn } = useSession();
  const [step, setStep] = useState<1 | 2>(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [created, setCreated] = useState(false);
  // Dois formulários independentes: voltar não perde o que foi digitado.
  const accountForm = useZodForm(accountSchema, {
    email: '',
    password: '',
    confirmPassword: '',
  });
  const personalForm = useZodForm(personalStepSchema, {
    fullName: '',
    gender: '',
    state: '',
    city: '',
  });
  const state = useWatch({ control: personalForm.control, name: 'state' });
  const cities = useQuery(citiesQuery(state));
  // Trocar de estado invalida a cidade escolhida.
  useEffect(() => {
    personalForm.resetField('city', { defaultValue: '' });
  }, [state, personalForm]);
  const mutation = useMutation({
    gcTime: 0,
    mutationFn: async (values: RegisterValues) => {
      if (!created) {
        await register(values);
        setCreated(true);
      }
      // Conta já criada e login falhou: um novo toque só refaz o login.
      await signIn(
        await login({ email: values.email, password: values.password }),
      );
    },
  });
  const goNext = accountForm.handleSubmit(() => {
    setDirection('forward');
    setStep(2);
  });
  const goBack = () => {
    setDirection('back');
    setStep(1);
  };
  const submit = personalForm.handleSubmit((personal) =>
    mutation.mutate({
      ...accountSchema.parse(accountForm.getValues()),
      ...personal,
    }),
  );
  const cityOptions = (cities.data ?? []).map((city) => ({
    value: city,
    label: city,
  }));
  return (
    <SlantShell
      title={step === 1 ? 'Faça parte do jogo.' : 'Seus dados.'}
      text={
        step === 1
          ? 'Crie sua conta. Depois, escolha seu esporte e conte como você gosta de jogar.'
          : 'Como devemos te chamar e onde você joga.'
      }
      header={
        <View className='gap-2'>
          <Text className='text-sm text-brand-light'>{`Etapa ${step} de ${TOTAL_STEPS}`}</Text>
          <StepProgress current={step} total={TOTAL_STEPS} tone='light' />
        </View>
      }
      footer={
        step === 1 ? (
          <View className='flex-row items-center justify-center gap-1'>
            <Text variant='muted'>Já tem uma conta?</Text>
            <Link href='/login' asChild>
              <Button variant='ghost' label='Entrar' className='h-auto px-1' />
            </Link>
          </View>
        ) : undefined
      }
    >
      {step === 1 ? (
        <StepTransition id={1} direction={direction}>
          <FormProvider {...accountForm}>
            <View className='gap-4'>
              <FormTextField
                name='email'
                label='E-mail'
                placeholder='voce@exemplo.com'
                autoCapitalize='none'
                autoComplete='email'
                keyboardType='email-address'
                textContentType='emailAddress'
                maxLength={255}
                editable={!created}
              />
              <FormTextField
                name='password'
                label='Senha'
                placeholder='Mínimo de 8 caracteres'
                hint='Use letra maiúscula, minúscula, número e um caractere especial.'
                secure
                autoComplete='new-password'
                textContentType='newPassword'
                editable={!created}
              />
              <FormTextField
                name='confirmPassword'
                label='Confirmar senha'
                placeholder='Repita a senha'
                secure
                autoComplete='new-password'
                editable={!created}
                returnKeyType='next'
                onSubmitEditing={() => void goNext()}
              />
              <Button label='Continuar' onPress={() => void goNext()} />
            </View>
          </FormProvider>
        </StepTransition>
      ) : (
        <StepTransition id={2} direction={direction}>
          <FormProvider {...personalForm}>
            <View className='gap-4'>
              <Pressable
                accessibilityRole='button'
                accessibilityLabel='Voltar'
                hitSlop={8}
                className='h-10 flex-row items-center gap-1.5 self-start rounded-pill bg-brand-muted pl-2 pr-3 active:opacity-80'
                onPress={goBack}
              >
                <ArrowLeft size={18} color={palette.colors.brand} />
                <Text className='font-inter-medium text-sm text-brand'>
                  Voltar
                </Text>
              </Pressable>
              <FormTextField
                name='fullName'
                label='Nome completo'
                placeholder='Seu nome e sobrenome'
                autoComplete='name'
                textContentType='name'
                maxLength={150}
                editable={!created}
              />
              <FormPickerField
                name='gender'
                label='Gênero'
                placeholder='Selecione uma opção'
                options={genderOptions}
                hint='Usado para respeitar a composição dos jogos. Não aparece no seu perfil público.'
                disabled={created}
              />
              <FormPickerField
                name='state'
                label='Estado'
                placeholder='UF'
                options={ufOptions}
                disabled={created}
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
                disabled={created || !isUf(state)}
                hint={
                  cities.isError
                    ? 'Não foi possível carregar as cidades. Tente novamente.'
                    : 'Onde você joga?'
                }
              />
              <FormError error={mutation.error} />
              <SubmitButton
                busy={mutation.isPending}
                busyLabel={created ? 'Entrando…' : 'Criando conta…'}
                label={created ? 'Entrar' : 'Criar minha conta'}
                onPress={() => void submit()}
              />
            </View>
          </FormProvider>
        </StepTransition>
      )}
    </SlantShell>
  );
}
