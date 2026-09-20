import '../global.css';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';

import { ErrorState } from '@/components/ace/states';
import palette from '@/config/palette.json';
import { SessionProvider, useSession } from '@/features/auth/session';
import { bindAppStateToQueryFocus, queryClient } from '@/lib/react-query';

void SplashScreen.preventAutoHideAsync();

export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => Promise<void>;
}) {
  return <ErrorState error={error} retry={() => void retry()} />;
}

// A splash só sai quando a sessão salva foi validada: sem piscar o login
// para quem já está logado.
function SplashGate({ children }: { children: ReactNode }) {
  const { status } = useSession();
  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);
  return status === 'loading' ? null : <>{children}</>;
}

export default function RootLayout() {
  const [fontsReady, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  useEffect(() => bindAppStateToQueryFocus(), []);
  // Erro de fonte não bloqueia o app: segue com a fonte do sistema.
  if (!fontsReady && !fontError) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <SplashGate>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: palette.colors.background },
                }}
              />
            </SplashGate>
            <Toaster position='top-center' />
          </SessionProvider>
        </QueryClientProvider>
        <StatusBar style='dark' />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
