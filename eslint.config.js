const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const checkFile = require('eslint-plugin-check-file');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = defineConfig([
  globalIgnores([
    'node_modules/**',
    '.expo/**',
    'dist/**',
    'coverage/**',
    'ios/**',
    'android/**',
    'expo-env.d.ts',
  ]),
  expoConfig,
  prettierConfig,
  {
    files: ['**/*.{ts,tsx,js,cjs,mjs}'],
    plugins: { prettier: prettierPlugin, 'check-file': checkFile },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
        node: true,
      },
    },
    rules: {
      'prettier/prettier': 'error',
      'import/no-cycle': 'error',
      // Mesmas exceções do web: `import Axios from 'axios'` é o uso oficial.
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/features/auth',
              from: './src/features',
              except: ['./auth'],
            },
            { target: './src/features', from: './app' },
            {
              target: [
                './src/components',
                './src/hooks',
                './src/lib',
                './src/types',
              ],
              from: ['./src/features', './app'],
            },
          ],
        },
      ],
      'check-file/filename-naming-convention': [
        'error',
        { 'src/**/*.{ts,tsx}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': [
        'error',
        { 'src/**/': 'KEBAB_CASE' },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      // Tests exercise contracts across layers on purpose.
      'import/no-restricted-paths': 'off',
    },
  },
]);
