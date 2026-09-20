import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import palette from '@/config/palette.json';

import { Logo } from './logo';

// Mesmo corte do web em telas estreitas (`--slant: 28px`): a base do painel
// navy sobe da direita para a esquerda, como a diagonal do A da logo.
export const SLANT = 28;

/** Painel navy com a diagonal na base; único motivo gráfico herdado do site. */
export function SlantPanel({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: object;
}) {
  return (
    <View
      className={className}
      style={[{ backgroundColor: palette.colors.navy }, style]}
    >
      {children}
      <Svg
        width='100%'
        height={SLANT}
        viewBox='0 0 100 100'
        preserveAspectRatio='none'
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
        pointerEvents='none'
      >
        <Polygon points='0,0 0,100 100,100' fill={palette.colors.background} />
      </Svg>
    </View>
  );
}

/**
 * Moldura das telas de acesso e do assistente: logo branca e título sobre o
 * navy, e o conteúdo num cartão que invade o corte. Sem sombra, como no web.
 */
export function SlantShell({
  title,
  text,
  header,
  hero = false,
  children,
  footer,
}: {
  title: string;
  text?: string;
  /** Linha extra dentro do painel (ex.: progresso do assistente). */
  header?: ReactNode;
  /** Telas curtas (login, esqueci a senha): painel mais alto, título na base. */
  hero?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <KeyboardAvoidingView
      className='flex-1 bg-background'
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className='flex-1'
        contentContainerClassName='grow pb-8'
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <StatusBar style='light' />
        <SlantPanel
          className='justify-end gap-5 px-5'
          style={{
            paddingTop: insets.top + 24,
            paddingBottom: SLANT + 44,
            minHeight: hero ? height * 0.42 : undefined,
          }}
        >
          <Logo width={92} color='#ffffff' />
          {header}
          <View className='gap-1.5'>
            <Text className='font-inter-bold text-[28px] leading-9 tracking-tight text-white'>
              {title}
            </Text>
            {text && (
              <Text className='text-base leading-6 text-brand-light'>
                {text}
              </Text>
            )}
          </View>
        </SlantPanel>
        <View
          className='mx-5 rounded-panel border border-border bg-card p-5'
          style={{ marginTop: -(SLANT + 12) }}
        >
          {children}
        </View>
        {footer && <View className='px-5 pt-5'>{footer}</View>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
