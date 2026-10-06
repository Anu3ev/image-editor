// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig, devices } from '@playwright/test'

const PLAYWRIGHT_HOST = '127.0.0.1'
const PLAYWRIGHT_PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4173)
const PLAYWRIGHT_BASE_URL = `https://${PLAYWRIGHT_HOST}:${PLAYWRIGHT_PORT}`

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // E2E always runs against its own Vite server and must not depend on the user's main dev server.
  webServer: {
    command: `npm run dev:e2e -- --port ${PLAYWRIGHT_PORT}`,
    url: PLAYWRIGHT_BASE_URL,
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI
  }
})
