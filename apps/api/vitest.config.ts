import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['development'] },
  ssr: { resolve: { conditions: ['development'] } },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // API tests share one local Supabase database; run files sequentially.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: { NODE_ENV: 'test' },
  },
});
