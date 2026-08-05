import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  { ignores: ['dist', 'dist-ssr', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      // 카드 트리거를 감싸는 래퍼는 의도적으로 role 없이 둡니다.
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
      // 스크롤 상자는 안에 포커스 받을 것이 없으면 키보드로 굴릴 수 없어
      // tabIndex 0이 필요합니다(WCAG 2.1.1). 이름을 붙이라는 뜻으로 role은
      // 요구하되 group을 기본값 tabpanel과 함께 허용합니다.
      'jsx-a11y/no-noninteractive-tabindex': ['error', { tags: [], roles: ['tabpanel', 'group'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['scripts/**/*.mjs', '*.config.js', '*.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
