import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/test-results/**', '**/playwright-report/**', 'apps/web/*.tmp.mjs', 'supabase/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // App wiring and shared helper modules intentionally mix exports.
    files: ['apps/web/src/app/**', 'apps/web/src/components/admin/AdminUi.tsx', 'apps/web/src/pages/shared-content.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts', 'apps/web/e2e/**/*.ts', 'scripts/**/*.mjs', 'apps/web/scripts/**/*.mjs', '**/*.config.{ts,js}'],
    languageOptions: { globals: globals.node },
  },
);
