import type { ReactNode } from 'react';
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  useReducedMotion,
} from 'react-native-reanimated';

import { EASE_OUT, STEP_MS } from '@/lib/motion';

/**
 * Troca de etapa de assistente: a etapa nova entra deslizando na direção do
 * avanço (ou do retorno). Só `entering` — uma saída animada manteria a etapa
 * antiga no layout e empurraria a nova para baixo.
 */
export function StepTransition({
  id,
  direction = 'forward',
  children,
}: {
  id: string | number;
  direction?: 'forward' | 'back';
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const entering = reduced
    ? FadeIn.duration(160)
    : (direction === 'forward' ? FadeInRight : FadeInLeft)
        .duration(STEP_MS)
        .easing(EASE_OUT);
  return (
    <Animated.View key={id} entering={entering} style={{ gap: 24 }}>
      {children}
    </Animated.View>
  );
}
