import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Allow throwaway uppercase-prefixed args (e.g. unused React-y props) and
      // caught errors to be ignored without lint noise.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', args: 'none', caughtErrors: 'none' }],
      // Dev-only HMR hint: context files legitimately export hooks beside their
      // provider component. Not a correctness issue — keep as a warning.
      'react-refresh/only-export-components': 'warn',
      // Opinionated "you might not need an effect" advice. Our mount-time data
      // fetches are intentional; keep visible as a warning rather than failing CI.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
