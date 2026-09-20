import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import palette from '@/config/palette.json';
import { EASE_SHEET, SHEET_MS } from '@/lib/motion';

import { Text } from './text';

/** Folha inferior para formulários curtos; mesmo padrão de Modal do PickerField. */
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    // O fundo só esmaece (Modal); a folha sobe por conta própria com a
    // curva de sheet do iOS — deslizar o fundo junto é o que parece barato.
    <Modal
      visible={visible}
      animationType='fade'
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className='flex-1 justify-end'
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Fechar a folha'
          className='absolute inset-0 bg-[#00000066]'
          onPress={onClose}
        />
        <Animated.View
          entering={SlideInDown.duration(SHEET_MS).easing(EASE_SHEET)}
          style={{
            maxHeight: '90%',
            borderTopLeftRadius: palette.radius.panel,
            borderTopRightRadius: palette.radius.panel,
            backgroundColor: palette.colors.card,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <View className='flex-row items-center justify-between border-b border-border px-5 py-4'>
            <Text variant='subtitle'>{title}</Text>
            <Pressable
              accessibilityRole='button'
              accessibilityLabel='Fechar'
              hitSlop={8}
              onPress={onClose}
            >
              <X size={22} color={palette.colors.foreground} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerClassName='gap-4 px-5 pt-4'
            keyboardShouldPersistTaps='handled'
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
