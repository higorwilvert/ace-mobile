import { Redirect, Stack } from 'expo-router';

import { LoadingState } from '@/components/ace/states';
import palette from '@/config/palette.json';
import { useSession } from '@/features/auth/session';
import { useLiveMatch } from '@/features/notifications/use-live-match';
import { usePushNotifications } from '@/features/notifications/use-push-notifications';

// Qualquer tela empilhada (inclusive por deep link) nasce com as abas por
// baixo, para sempre existir um "voltar".
export const unstable_settings = { anchor: '(tabs)' };

export default function AppLayout() {
  const { status } = useSession();
  // T41: push e Live Activity/Live Update vivem enquanto há sessão.
  usePushNotifications(status === 'signed-in');
  useLiveMatch(status);
  if (status === 'loading') return <LoadingState />;
  if (status === 'signed-out') return <Redirect href='/login' />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.colors.card },
        headerTintColor: palette.colors.brand,
        headerTitleStyle: {
          fontFamily: 'Inter_600SemiBold',
          color: palette.colors.foreground,
        },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: palette.colors.background },
      }}
    >
      <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
      {/* Sair do assistente é decisão explícita, não um arrasto acidental. */}
      <Stack.Screen
        name='onboarding'
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen name='personal' options={{ title: 'Dados pessoais' }} />
      <Stack.Screen name='sports' options={{ title: 'Meus esportes' }} />
      <Stack.Screen
        name='availability'
        options={{ title: 'Disponibilidade' }}
      />
      <Stack.Screen name='rating' options={{ title: 'Rating e evolução' }} />
      <Stack.Screen name='account' options={{ title: 'Conta' }} />
      <Stack.Screen name='players/index' options={{ title: 'Jogadores' }} />
      <Stack.Screen
        name='players/[userId]/index'
        options={{ title: 'Perfil' }}
      />
      <Stack.Screen
        name='players/[userId]/friends'
        options={{ title: 'Amigos' }}
      />
      <Stack.Screen name='matches/new' options={{ title: 'Nova partida' }} />
      <Stack.Screen
        name='matches/[matchId]/index'
        options={{ title: 'Partida' }}
      />
      <Stack.Screen
        name='matches/[matchId]/edit'
        options={{ title: 'Editar partida' }}
      />
      <Stack.Screen
        name='matches/[matchId]/result'
        options={{ title: 'Registrar placar' }}
      />
      <Stack.Screen name='history' options={{ title: 'Histórico' }} />
      <Stack.Screen name='notifications' options={{ title: 'Notificações' }} />
    </Stack>
  );
}
