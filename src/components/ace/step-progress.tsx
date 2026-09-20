import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import palette from '@/config/palette.json';
import { CSS_EASE_OUT } from '@/lib/motion';

/** Linha fina que preenche — o web decidiu por progresso discreto, sem círculos. */
export function StepProgress({
  current,
  total,
  tone = 'brand',
}: {
  current: number;
  total: number;
  /** `light` para fundo navy. */
  tone?: 'brand' | 'light';
}) {
  const percent = Math.min(100, Math.max(0, (current / total) * 100));
  const light = tone === 'light';
  return (
    <View
      className='h-[3px] w-full overflow-hidden rounded-pill'
      style={{
        backgroundColor: light
          ? 'rgba(255,255,255,0.22)'
          : palette.colors.muted,
      }}
      accessibilityRole='progressbar'
      accessibilityLabel={`Etapa ${current} de ${total}`}
      accessibilityValue={{ min: 0, max: total, now: current }}
    >
      {/* Absoluto e sem filhos: animar `width` aqui não relayouta mais nada. */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${percent}%`,
          borderRadius: 999,
          backgroundColor: light ? '#ffffff' : palette.colors.brand,
          transitionProperty: 'width',
          transitionDuration: 320,
          transitionTimingFunction: CSS_EASE_OUT,
        }}
      />
    </View>
  );
}
