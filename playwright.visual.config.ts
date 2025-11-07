/**
 * Playwright Visual Regression Configuration
 * Wave-4: FE-vr-snapshot
 * Self-hosted visual testing without external SaaS
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/visual',
  
  // Snapshots configuration
  snapshotDir: './tests/visual/snapshots',
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{-snapshotSuffix}{ext}',
  
  // Fail on missing snapshots in CI
  ignoreSnapshots: process.env.CI ? false : !process.env.UPDATE_SNAPSHOTS,
  
  // Visual comparison settings
  expect: {
    toHaveScreenshot: {
      // Allow small differences (anti-aliasing, font rendering)
      maxDiffPixels: 100,
      maxDiffPixelRatio: 0.01, // 1%
      
      // Animation settling
      animations: 'disabled',
      
      // Pixel comparison threshold
      threshold: 0.2,
    },
  },
  
  // Test configuration
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  
  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report/visual' }],
    ['json', { outputFile: 'playwright-report/visual-results.json' }],
    ['list'],
  ],
  
  use: {
    // Base URL
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:6006',
    
    // Screenshot settings
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    
    // Viewport
    viewport: { width: 1280, height: 720 },
    
    // Ignore HTTPS errors (for self-signed certs in staging)
    ignoreHTTPSErrors: true,
  },
  
  // Test multiple viewports
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Desktop Firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  
  // Web server (Storybook)
  webServer: {
    command: 'npm run storybook',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
