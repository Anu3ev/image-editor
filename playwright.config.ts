import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e/tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: true,
  failOnFlakyTests: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [['list'], ['html', { open: 'never' }], ['json', {
    outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_NAME ?? 'test-results/results.json'
  }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
        : {}
    }
  }],
  // Keep test traffic on an isolated loopback server; no certificate bypass.
  webServer: {
    command: `npm run dev:e2e -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000
  }
})
