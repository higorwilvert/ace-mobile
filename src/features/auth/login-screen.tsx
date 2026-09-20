import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { FormProvider } from 'react-hook-form';
import { View } from 'react-native';

import { FormTextField } from '@/components/ace/form-fields';
import { SlantShell } from '@/components/ace/slant-shell';
import { FormError, SubmitButton } from '@/components/ace/states';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useZodForm } from '@/hooks/use-zod-form';

import { login, type LoginValues, loginSchema } from './api';
import { useSession } from './session';

export function LoginScreen() {
  const { signIn, expired, bootError } = useSession();
  const form = useZodForm(loginSchema, { email: '', password: '' });
  const mutation = useMutation({
    gcTime: 0,
    mutationFn: async (values: LoginValues) => signIn(await login(values)),
  });
  const submit = form.handleSubmit((values) => mutation.mutate(values));
  return (
    <SlantShell
      hero
      title='Bom ter você de volta.'
      text='Entre para ver suas partidas, convites e histórico.'
      footer={
        <View className='flex-row items-center justify-center gap-1'>
          <Text variant='muted'>Ainda não tem uma conta?</Text>
          <Link href='/register' asChild>
            <Button
              variant='ghost'
              label='Criar minha conta'
              className='h-auto px-1'
            />
          </Link>
        </View>
      }
    >
      <FormProvider {...form}>
        <View className='gap-4'>
          {expired && (
            <View
              className='rounded-card bg-brand-muted p-3'
              accessibilityRole='text'
            >
              <Text className='text-brand'>
                Sua sessão terminou. Entre novamente para continuar.
              </Text>
            </View>
          )}
          {bootError && <FormError error={bootError} />}
          <FormTextField
            name='email'
            label='E-mail'
            placeholder='voce@exemplo.com'
            autoCapitalize='none'
            autoComplete='email'
            keyboardType='email-address'
            textContentType='emailAddress'
            maxLength={255}
            returnKeyType='next'
          />
          <FormTextField
            name='password'
            label='Senha'
            placeholder='Sua senha'
            secure
            autoComplete='current-password'
            textContentType='password'
            returnKeyType='done'
            onSubmitEditing={() => void submit()}
          />
          <FormError error={mutation.error} />
          <SubmitButton
            busy={mutation.isPending}
            busyLabel='Entrando…'
            label='Entrar na minha conta'
            onPress={() => void submit()}
          />
          <Link href='/forgot-password' asChild>
            <Button
              variant='ghost'
              label='Esqueci minha senha'
              className='h-auto self-center px-1'
            />
          </Link>
        </View>
      </FormProvider>
    </SlantShell>
  );
}
