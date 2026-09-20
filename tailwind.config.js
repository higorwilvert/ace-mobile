const palette = require('./src/config/palette.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: palette.colors,
      borderRadius: Object.fromEntries(
        Object.entries(palette.radius).map(([name, px]) => [name, `${px}px`]),
      ),
      // Em RN o peso vem da família; classes explícitas por peso evitam
      // conflito com font-medium/font-semibold (utilitários de fontWeight).
      fontFamily: {
        inter: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
      },
    },
  },
  plugins: [],
};
