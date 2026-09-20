import { cva, type VariantProps } from 'class-variance-authority';
import { type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
} from 'react-native';
import Animated from 'react-native-reanimated';

import palette from '@/config/palette.json';
import { CSS_EASE_OUT, PRESS_MS } from '@/lib/motion';
import { cn } from '@/lib/utils';

import { Text } from './text';

const buttonVariants = cva(
  'h-12 flex-row items-center justify-center gap-2 rounded-control px-4',
  {
    variants: {
      variant: {
        primary: 'bg-brand',
        secondary: 'bg-brand-muted',
        ghost: 'bg-transparent',
        destructive: 'bg-destructive',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);
const labelVariants = cva('font-inter-semibold text-base', {
  variants: {
    variant: {
      primary: 'text-white',
      secondary: 'text-brand',
      ghost: 'text-brand',
      destructive: 'text-white',
    },
  },
  defaultVariants: { variant: 'primary' },
});
const spinnerColor = {
  primary: '#ffffff',
  secondary: palette.colors.brand,
  ghost: palette.colors.brand,
  destructive: '#ffffff',
} as const;

export type ButtonProps = Omit<PressableProps, 'children'> &
  VariantProps<typeof buttonVariants> & {
    label: string;
    busy?: boolean;
    busyLabel?: string;
    icon?: ReactNode;
  };

export function Button({
  label,
  busy = false,
  busyLabel,
  icon,
  variant,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const resolved = variant ?? 'primary';
  const blocked = Boolean(disabled) || busy;
  // Resposta no press-in (o que o dedo sente), não no toque completo.
  const [pressed, setPressed] = useState(false);
  return (
    <Animated.View
      style={{
        transform: [{ scale: pressed && !blocked ? 0.97 : 1 }],
        transitionProperty: 'transform',
        transitionDuration: PRESS_MS,
        transitionTimingFunction: CSS_EASE_OUT,
      }}
    >
      <Pressable
        accessibilityRole='button'
        accessibilityState={{ disabled: blocked, busy }}
        disabled={blocked}
        pressRetentionOffset={12}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        className={cn(
          buttonVariants({ variant: resolved }),
          blocked && 'opacity-50',
          resolved === 'ghost' && pressed && 'bg-brand-muted',
          className,
        )}
        {...props}
      >
        {busy ? <ActivityIndicator color={spinnerColor[resolved]} /> : icon}
        <Text className={labelVariants({ variant: resolved })}>
          {busy && busyLabel ? busyLabel : label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
