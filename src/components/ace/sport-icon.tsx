import { Image, type ImageSource } from 'expo-image';
import { CircleDot } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import palette from '@/config/palette.json';

export const sportColors = (slug: string) =>
  (palette.sports as Record<string, { bg: string; ink: string }>)[slug] ?? {
    bg: palette.colors['brand-muted'],
    ink: palette.colors.brand,
  };

/** Versões de 384 px dos PNGs mestres, adequadas aos chips em telas Retina. */
export const sportCourtImages: Record<string, ImageSource> = {
  padel: require('../../../assets/sports/ui/padel.png'),
  beach_tennis: require('../../../assets/sports/ui/beach_tennis.png'),
  tenis: require('../../../assets/sports/ui/tenis.png'),
  pickleball: require('../../../assets/sports/ui/pickleball.png'),
};

/** Chip decorativo; o nome da modalidade sempre aparece ao lado. */
export function SportIcon({
  slug,
  size = 44,
}: {
  slug: string;
  size?: number;
}) {
  const { bg, ink } = sportColors(slug);
  const source = sportCourtImages[slug];
  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, backgroundColor: bg },
      ]}
      accessibilityElementsHidden
      importantForAccessibility='no-hide-descendants'
    >
      {source ? (
        <Image
          testID={`sport-court-${slug}`}
          source={source}
          contentFit='contain'
          cachePolicy='memory'
          style={styles.image}
        />
      ) : (
        <CircleDot color={ink} size={size * 0.68} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: palette.radius.card,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
