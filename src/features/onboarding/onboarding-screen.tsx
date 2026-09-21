import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { CalendarClock, PartyPopper } from 'lucide-react-native';
import { useState } from 'react';
import { FormProvider, useWatch } from 'react-hook-form';
import { View } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';

import { FormPickerField, FormTextField } from '@/components/ace/form-fields';
import { SlantShell } from '@/components/ace/slant-shell';
import {
  ErrorState,
  FormError,
  LoadingState,
  SubmitButton,
} from '@/components/ace/states';
import { StepProgress } from '@/components/ace/step-progress';
import { StepTransition } from '@/components/ace/step-transition';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { authQueryOptions } from '@/features/auth/api';
import { useSession } from '@/features/auth/session';
import { profilesQuery, updateUser } from '@/features/players/api';
import { AvatarPicker } from '@/features/players/avatar-picker';
import { handOptions } from '@/features/players/labels';
import { personalExtrasSchema } from '@/features/players/schemas';
import { SportForm } from '@/features/players/sport-form';
import { useZodForm } from '@/hooks/use-zod-form';
import { EASE_OUT } from '@/lib/motion';
import { formatPhone } from '@/lib/utils';
import type { Sport } from '@/types/api';

import { SportChoice } from './sport-choice';

const TOTAL_STEPS = 5;

/** Etapa 3, opcional: telefone, avatar, bio e mão dominante. */
function ExtrasStep({ onDone }: { onDone: () => void }) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const form = useZodForm(personalExtrasSchema, {
    phone: user?.phone ?? '',
    bio: user?.bio ?? '',
    dominantHand: user?.dominantHand ?? '',
  });
  const bio = useWatch({ control: form.control, name: 'bio' });
  const mutation = useMutation({
    mutationFn: updateUser,
    onSuccess: (updated) => {
      queryClient.setQueryData(authQueryOptions.queryKey, updated);
      onDone();
    },
  });
  const submit = form.handleSubmit((values) => mutation.mutate(values));
  return (
    <>
      {user && <AvatarPicker user={user} />}
      <FormProvider {...form}>
        <View className='gap-4'>
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
            label='Salvar e continuar'
            onPress={() => void submit()}
          />
          <Button variant='ghost' label='Pular' onPress={onDone} />
        </View>
      </FormProvider>
    </>
  );
}

export function OnboardingScreen() {
  const router = useRouter();
  const profiles = useQuery(profilesQuery);
  const [step, setStep] = useState<3 | 4 | 5>(3);
  const [sport, setSport] = useState<Sport | null>(null);
  const [done, setDone] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const go = (next: 3 | 4 | 5) => {
    setDirection(next > step ? 'forward' : 'back');
    setStep(next);
  };

  if (profiles.isPending) return <LoadingState />;
  if (profiles.isError)
    return (
      <ErrorState error={profiles.error} retry={() => profiles.refetch()} />
    );
  // `done` segura a tela de conclusão: sem isso, criar o perfil dispararia o
  // redirecionamento antes de o jogador ver o fim do assistente.
  if (profiles.data.length > 0 && !done) return <Redirect href='/' />;

  if (done)
    return (
      <Screen scroll className='justify-center gap-6 py-8'>
        {/* Único momento de "delight" do assistente: o selo aparece com mola. */}
        <Animated.View
          entering={ZoomIn.springify().duration(500).dampingRatio(0.7)}
          style={{ alignSelf: 'center' }}
        >
          <View className='h-20 w-20 items-center justify-center rounded-full bg-brand-light'>
            <PartyPopper size={36} color={palette.colors.brand} />
          </View>
        </Animated.View>
        <Animated.View
          entering={FadeInUp.delay(120).duration(260).easing(EASE_OUT)}
          style={{ gap: 24 }}
        >
          <View className='items-center gap-2'>
            <Text variant='title' className='text-center'>
              Tudo pronto.
            </Text>
            <Text variant='muted' className='text-center'>
              Seu perfil esportivo está criado. Contar quando você costuma jogar
              ajuda a encontrar partidas no seu horário.
            </Text>
          </View>
          <View className='gap-3'>
            <Button
              label='Definir minha disponibilidade'
              icon={<CalendarClock size={18} color='#ffffff' />}
              // Início por baixo: a disponibilidade empilha com voltar e abas.
              onPress={() => {
                router.replace('/');
                router.push('/availability');
              }}
            />
            <Button
              variant='secondary'
              label='Ir para o meu início'
              onPress={() => router.replace('/')}
            />
          </View>
        </Animated.View>
      </Screen>
    );

  const copy = {
    3: {
      title: 'Personalize seu perfil.',
      text: 'Tudo aqui é opcional. Dá para preencher depois em Dados pessoais.',
    },
    4: {
      title: 'Qual é o seu esporte?',
      text: 'Escolha a modalidade principal. Dá para adicionar outras depois.',
    },
    5: {
      title: 'Como você joga',
      text: `Sua categoria em ${sport?.name ?? 'sua modalidade'} define o rating inicial. Ajuste quando quiser.`,
    },
  }[step];

  return (
    <SlantShell
      title={copy.title}
      text={copy.text}
      header={
        <View className='gap-2'>
          <Text className='text-sm text-brand-light'>{`Etapa ${step} de ${TOTAL_STEPS}`}</Text>
          <StepProgress current={step} total={TOTAL_STEPS} tone='light' />
        </View>
      }
    >
      {step === 3 && (
        <StepTransition id={3} direction={direction}>
          <ExtrasStep onDone={() => go(4)} />
        </StepTransition>
      )}
      {step === 4 && (
        <StepTransition id={4} direction={direction}>
          <SportChoice selected={sport} onSelect={setSport} />
          <View className='gap-3'>
            <Button label='Continuar' disabled={!sport} onPress={() => go(5)} />
            <Button
              variant='ghost'
              label='Agora não'
              onPress={() => router.replace('/')}
            />
          </View>
        </StepTransition>
      )}
      {step === 5 && sport && (
        <StepTransition id={5} direction={direction}>
          <SportForm
            sports={[sport]}
            fixedSportId={sport.id}
            forcePrincipal
            submitLabel='Concluir'
            onSaved={() => setDone(true)}
          />
          <Button
            variant='ghost'
            label='Trocar modalidade'
            onPress={() => go(4)}
          />
        </StepTransition>
      )}
    </SlantShell>
  );
}
