import { Redirect, Stack } from 'expo-router';

import palette from '@/config/palette.json';
import { useSession } from '@/features/auth/session';

export default function AuthLayout() {
  const { status } = useSession();
  // O onboarding decide: sem perfil esportivo mostra o assistente, com perfil
  // redireciona para o Início. Decidir aqui criaria corrida com a navegação
  // da tela de cadastro.
  if (status === 'signed-in') return <Redirect href='/onboarding' />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.colors.background },
      }}
    />
  );
}
