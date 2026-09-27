import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { env } from '@/config/env';
import type { RatingTierDefinition } from '@/types/api';

const fallbackImage = require('../../../assets/brand/ace-a-solid.png');

/**
 * Medalha da divisão e do nível, com o numeral gravado no aro. Se a imagem da
 * API falhar, mostramos o A oficial da ACE.
 */
export function TierBadge({
  tier,
  size = 40,
  label,
}: {
  tier: Pick<RatingTierDefinition, 'division' | 'level' | 'imagePath'>;
  size?: number;
  label?: string;
}) {
  const uri = tier.imagePath ? new URL(tier.imagePath, env.API_URL).href : null;
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <View
      testID='tier-badge'
      style={{ width: size, height: size }}
      {...(label
        ? {
            accessible: true,
            accessibilityRole: 'image',
            accessibilityLabel: label,
          }
        : {
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants',
          })}
    >
      <Image
        testID='tier-badge-image'
        source={uri && failed !== uri ? { uri } : fallbackImage}
        style={{ width: size, height: size }}
        contentFit='contain'
        cachePolicy='disk'
        transition={0}
        onError={uri ? () => setFailed(uri) : undefined}
      />
    </View>
  );
}

/** Medalha pequena com o nome completo da divisão ao lado, para listas. */
export function TierTag({
  tier,
  size = 20,
}: {
  tier: Pick<
    RatingTierDefinition,
    'division' | 'level' | 'imagePath' | 'label'
  >;
  size?: number;
}) {
  return (
    <View className='flex-row items-center gap-1.5'>
      <TierBadge tier={tier} size={size} />
      <Text className='font-inter-semibold text-xs text-foreground'>
        {tier.label}
      </Text>
    </View>
  );
}
