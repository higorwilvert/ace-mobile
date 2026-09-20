import { Image } from 'react-native';

import palette from '@/config/palette.json';

// Mesmo PNG do web (`public/brand/ace-logo.png`, alfa usado como máscara):
// aqui o `tintColor` faz o papel do `mask` + `currentColor`.
const source = require('../../../assets/brand/ace-logo.png');
const RATIO = 1920 / 819;

export function Logo({
  width = 96,
  color = palette.colors.brand,
}: {
  width?: number;
  color?: string;
}) {
  return (
    <Image
      source={source}
      accessibilityRole='image'
      accessibilityLabel='ACE'
      resizeMode='contain'
      style={{ width, height: width / RATIO, tintColor: color }}
    />
  );
}
