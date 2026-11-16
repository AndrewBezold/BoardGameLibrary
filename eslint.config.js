// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // All queries go through src/db/, which filters soft-deleted rows with live().
    files: ['src/**'],
    ignores: ['src/db/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['drizzle-orm', 'drizzle-orm/*', 'expo-sqlite', '**/db/client', '**/db/schema'],
              message:
                'Query through a function in src/db/ so soft-deleted rows are filtered. Types are re-exported there (e.g. User from @/db/people).',
            },
          ],
        },
      ],
    },
  },
]);
