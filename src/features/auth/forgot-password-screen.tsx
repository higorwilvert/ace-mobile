import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { FormProvider } from 'react-hook-form';
import { View } from 'react-native';

import { FormTextField } from '@/components/ace/form-fields';
import { SlantShell } from '@/components/ace/slant-shell';
import { FormError, SubmitButton } from '@/components/ace/states';
import { StepTransition } from '@/components/ace/step-transition';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';
import { useZodForm } from '@/hooks/use-zod-form';

import { forgotPassword, recoverySchema } from './api';

export function ForgotPasswordScreen() {
  const form = useZodForm(recoverySchema, { email: '' });
  const mutation = useMutation({ gcTime: 0, mutationFn: forgotPassword });
  const submit = form.handleSubmit((values) => mutation.mutate(values));
  const sent = mutation.isSuccess;
  return (
    <SlantShell
      hero
      title={sent ? 'Verifique seu e-mail.' : 'Esqueceu a senha?'}
      text={
        sent
          ? undefined
          : 'Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.'
      }
      footer={
        <View className='flex-row items-center justify-center gap-1'>
          <Text variant='muted'>Lembrou a senha?</Text>
          <Link href='/login' asChild>
            <Button variant='ghost' label='Entrar' className='h-auto px-1' />
          </Link>
        </View>
      }
    >
      {sent ? (
        <StepTransition id='sent'>
          <View className='items-center gap-3'>
            <View className='h-14 w-14 items-center justify-center rounded-full bg-brand-muted'>
              <MailCheck size={28} color={palette.colors.brand} />
            </View>
            {/* Mesma mensagem exista a conta ou não: a API não revela e-mails. */}
            <Text className='text-center'>
              Se houver uma conta ativa com esse e-mail, enviaremos as
              instruções de recuperação.
            </Text>
            <Text variant='muted' className='text-center'>
              O link de redefinição abre no navegador. Depois de trocar a senha,
              volte aqui e entre normalmente.
            </Text>
            <Button
              variant='secondary'
              label='Tentar outro e-mail'
              className='mt-2 self-stretch'
              onPress={() => mutation.reset()}
            />
          </View>
        </StepTransition>
      ) : (
        <FormProvider {...form}>
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
              returnKeyType='send'
              onSubmitEditing={() => void submit()}
            />
            <FormError error={mutation.error} />
            <SubmitButton
              busy={mutation.isPending}
              busyLabel='Enviando…'
              label='Enviar instruções'
              onPress={() => void submit()}
            />
          </View>
        </FormProvider>
      )}
    </SlantShell>
  );
}
