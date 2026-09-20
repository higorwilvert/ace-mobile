import { cva, type VariantProps } from 'class-variance-authority';
import {
  Text as NativeText,
  type TextProps as NativeTextProps,
} from 'react-native';

import { cn } from '@/lib/utils';

const textVariants = cva('font-inter text-foreground', {
  variants: {
    variant: {
      title: 'font-inter-bold text-2xl leading-8 tracking-tight',
      subtitle: 'font-inter-semibold text-lg leading-6',
      body: 'text-base leading-6',
      label: 'font-inter-medium text-sm leading-5',
      muted: 'text-sm leading-5 text-muted-foreground',
      error: 'text-sm leading-5 text-destructive',
    },
  },
  defaultVariants: { variant: 'body' },
});

export type TextProps = NativeTextProps & VariantProps<typeof textVariants>;

export function Text({ variant, className, ...props }: TextProps) {
  return (
    <NativeText
      className={cn(textVariants({ variant }), className)}
      {...props}
    />
  );
}
