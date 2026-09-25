import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import palette from '@/config/palette.json';
import { cn } from '@/lib/utils';

export type ScreenProps = {
  children: ReactNode;
  /** Conteúdo rolável com teclado tratado (formulários). */
  scroll?: boolean;
  className?: string;
  /** Telas dentro das Tabs usam só `['top']`: a barra já cobre a base. */
  edges?: ('top' | 'bottom')[];
  /** Puxar para atualizar (T38): o indicador fica até a promessa terminar. */
  onRefresh?: () => Promise<unknown>;
};

export function Screen({
  children,
  scroll = false,
  className,
  edges = ['top', 'bottom'],
  onRefresh,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const padding = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
  };
  if (!scroll) {
    return (
      <View
        className={cn('flex-1 bg-background px-5', className)}
        style={padding}
      >
        {children}
      </View>
    );
  }
  return (
    <KeyboardAvoidingView
      className='flex-1 bg-background'
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={padding}
    >
      <ScrollView
        testID='screen-scroll'
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              tintColor={palette.colors.brand}
              colors={[palette.colors.brand]}
              onRefresh={() => {
                setRefreshing(true);
                void onRefresh().finally(() => setRefreshing(false));
              }}
            />
          ) : undefined
        }
        className='flex-1'
        contentContainerClassName={cn('grow px-5 pb-8', className)}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
