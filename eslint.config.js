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
  },
  // Node runtime files (server, scripts, CLI helpers)
  {
    files: ['server/**', 'scripts/**', 'server.js', 'test-*.js'],
    languageOptions: {
      globals: globals.node,
      parserOptions: { ecmaVersion: 'latest' },
    },
  },
  // Service worker files under public/ use serviceworker globals
  {
    files: ['public/**/sw.js', 'public/sw.js'],
    languageOptions: {
      globals: globals.serviceworker,
      parserOptions: { ecmaVersion: 'latest' },
    },
  },
])
