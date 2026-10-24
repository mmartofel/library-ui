import { defineConfig, devices } from '@playwright/test'

// E2E users and the OIDC authority come from .env.local (see .env.example).
try {
  process.loadEnvFile('.env.local')
} catch {
  // No .env.local: the variables must be set in the environment.
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    // Signs in each demo user once; tests pick a role with `test.use({ storageState: authFile(user) })`.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, dependencies: ['setup'] },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
