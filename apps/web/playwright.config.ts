import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  use: { baseURL: 'http://127.0.0.1:4175', viewport: {width: 1280, height: 800} },
  webServer: [
    { command: 'bun run vite preview --host 127.0.0.1 --port 4175 --strictPort', url: 'http://127.0.0.1:4175', reuseExistingServer: false },
    { command: 'bun run vite --host 127.0.0.1 --port 4176 --strictPort', url: 'http://127.0.0.1:4176', env: { VITE_ARCHIMEDES_PROVIDER: 'live' }, reuseExistingServer: false },
  ],
});