import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { env } from '@/config/env';
import type { RatingTierDefinition, TierDivision } from '@/types/api';

// Cor do aro do escudo de reserva. É a única cor de material fora da arte e
// não aparece em texto, barra ou fundo: o resto da interface usa os tokens.
const rim: Record<TierDivision, string> = {
  bronze: '#b8743d',
  prata: '#a9b5c3',
  ouro: '#d6a52b',
  platina: '#c9d3c8',
  esmeralda: '#1f8a58',
  diamante: '#9fd4f0',
};
const SHIELD = 'M32 3 58 11v22c0 17-11 29-26 36C17 62 6 50 6 33V11z';

/**
 * Escudo vetorial enquanto a arte da modalidade não existe na API: mesmo
 * desenho do emblema (escudo marinho, diagonal azul, aro do material e uma ou
 * duas barras de nível), em cores chapadas.
 */
function TierShield({
  division,
  level,
  size,
}: {
  division: TierDivision;
  level: 1 | 2;
  size: number;
}) {
  return (
    <Svg width={size} height={size} viewBox='0 0 64 72'>
      <Path d={SHIELD} fill={rim[division]} />
      <Path
        d={SHIELD}
        transform='translate(5.5 6) scale(0.828)'
        fill='#002462'
      />
      <Path d='M24 58 43 14h7L31 58z' fill='#0052be' />
      {Array.from({ length: level }, (_, i) => (
        <Rect
          key={i}
          x='22'
          y={level === 1 ? 51 : 47 + i * 7}
          width='20'
          height='4.5'
          rx='1.5'
          fill={rim[division]}
        />
      ))}
    </Svg>
  );
}

/**
 * Emblema da divisão. A arte vem da API (`imagePath`, sempre um caminho da
 * própria API); sem arte, ou se ela falhar, desenha o escudo da faixa. O nome
 * da divisão deve acompanhar o emblema: `label` só quando ele está sozinho.
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
      {uri && failed !== uri ? (
        <Image
          testID='tier-badge-image'
          source={{ uri }}
          style={{ width: size, height: size }}
          contentFit='contain'
          cachePolicy='disk'
          transition={0}
          onError={() => setFailed(uri)}
        />
      ) : (
        <TierShield division={tier.division} level={tier.level} size={size} />
      )}
    </View>
  );
}

/** Emblema pequeno com o nome da divisão ao lado, para listas. */
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
