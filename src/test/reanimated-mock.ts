// Mock oficial do Reanimated 4 + o que ele ainda não cobre. O jest.config
// aponta `react-native-reanimated/mock` para cá, então vale também para o
// re-mock que o `expo-router/testing-library` faz por conta própria.
const mock = jest.requireActual<Record<string, unknown>>(
  'react-native-reanimated/mock.js',
);

module.exports = {
  ...mock,
  useReducedMotion: () => false,
  cubicBezier: () => 'ease',
};
