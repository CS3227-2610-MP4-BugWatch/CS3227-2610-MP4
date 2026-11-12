import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/test/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
      exclude: ['src/test/**', '**/*.d.ts'],
      reporter: ['text-summary', 'html', 'json', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
})
