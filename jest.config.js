process.env.EXPO_PUBLIC_API_URL ??= 'http://localhost:3001';

const expoPreset = require('jest-expo/jest-preset');

// Bibliotecas publicadas só em ESM (.mjs) precisam passar pelo Babel, além
// das que o preset do Expo já transforma.
const extraEsmPackages = [
  'lucide-react-native',
  'sonner-native',
  // Fixado em 0.5 (ESM) pelo override em pnpm-workspace.yaml.
  'decode-uri-component',
];
const [defaultPattern, ...otherPatterns] = expoPreset.transformIgnorePatterns;
const babelTransform = expoPreset.transform['\\.[jt]sx?$'];

/** @type {import('jest').Config} */
module.exports = {
  ...expoPreset,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native-reanimated/mock$': '<rootDir>/src/test/reanimated-mock.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/dist/'],
  transform: { ...expoPreset.transform, '\\.m?[jt]sx?$': babelTransform },
  transformIgnorePatterns: [
    defaultPattern.replace('))', `|${extraEsmPackages.join('|')}))`),
    ...otherPatterns,
  ],
  clearMocks: true,
};
