import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'no-case-declarations': 'off',
      'no-empty': 'off',
      'no-unused-vars': 'off',
      'no-useless-escape': 'off',
      'prefer-const': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true, caughtErrors: 'none' }],
      '@typescript-eslint/ban-ts-comment': 'off',
      // Production console log prevention
      // Warns when console.log/debug/info/trace are used
      // Allows console.error and console.warn for production debugging
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      // Client Context Pattern Enforcement
      // Prevents direct useParams().clientSlug usage outside valid exceptions
      // Forces usage of useClientContext() hook for type safety
      'no-restricted-syntax': ['error', {
        selector: 'MemberExpression[object.callee.name="useParams"][property.name="clientSlug"]',
        message: '❌ Direct useParams().clientSlug is forbidden.\n\n' +
                 '✅ Use useClientContext().clientSlug instead.\n\n' +
                 'Valid exceptions: ClientLayout.tsx, useAgencyRouteGuard.ts\n\n' +
                 'See: apps/web/src/types/clientContext.ts and useClientContext().'
      }],
    },
  },
  // Valid exceptions: Allow useParams for route boundaries
  {
    files: ['**/ClientLayout.tsx', '**/useAgencyRouteGuard.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
])
