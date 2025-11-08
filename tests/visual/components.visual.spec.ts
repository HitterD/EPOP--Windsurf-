/**
 * Visual Regression Tests for UI Components
 * Wave-4: FE-vr-snapshot
 * Tests visual appearance of components in Storybook
 */

import { test, expect, type Page } from '@playwright/test'

/**
 * Helper to navigate to a story and wait for it to load
 */
async function gotoStory(page: Page, storyId: string) {
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`)
  await page.waitForLoadState('networkidle')
  
  // Wait for fonts and images to load
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500) // Additional settling time
}

/**
 * Helper to capture component screenshot
 */
async function captureComponent(page: Page, selector: string = 'body') {
  const element = await page.locator(selector)
  return await element.screenshot()
}

test.describe('Button Component', () => {
  test('default button', async ({ page }) => {
    await gotoStory(page, 'components-button--default')
    await expect(page).toHaveScreenshot('button-default.png')
  })

  test('primary button', async ({ page }) => {
    await gotoStory(page, 'components-button--primary')
    await expect(page).toHaveScreenshot('button-primary.png')
  })

  test('destructive button', async ({ page }) => {
    await gotoStory(page, 'components-button--destructive')
    await expect(page).toHaveScreenshot('button-destructive.png')
  })

  test('button with icon', async ({ page }) => {
    await gotoStory(page, 'components-button--with-icon')
    await expect(page).toHaveScreenshot('button-with-icon.png')
  })

  test('loading button', async ({ page }) => {
    await gotoStory(page, 'components-button--loading')
    await expect(page).toHaveScreenshot('button-loading.png')
  })

  test('disabled button', async ({ page }) => {
    await gotoStory(page, 'components-button--disabled')
    await expect(page).toHaveScreenshot('button-disabled.png')
  })
})

test.describe('Empty State Component', () => {
  test('basic empty state', async ({ page }) => {
    await gotoStory(page, 'components-empty-state--basic')
    await expect(page).toHaveScreenshot('empty-state-basic.png')
  })

  test('empty state with action', async ({ page }) => {
    await gotoStory(page, 'components-empty-state--with-action')
    await expect(page).toHaveScreenshot('empty-state-with-action.png')
  })

  test('no search results', async ({ page }) => {
    await gotoStory(page, 'components-empty-state--no-results')
    await expect(page).toHaveScreenshot('empty-state-no-results.png')
  })
})

test.describe('Loading State Component', () => {
  test('loading spinner', async ({ page }) => {
    await gotoStory(page, 'components-loading-state--spinner')
    await expect(page).toHaveScreenshot('loading-spinner.png', {
      // Spinner animates, allow more tolerance
      maxDiffPixelRatio: 0.05,
    })
  })

  test('skeleton loader', async ({ page }) => {
    await gotoStory(page, 'components-loading-state--skeleton')
    await expect(page).toHaveScreenshot('loading-skeleton.png', {
      // Skeleton has pulse animation
      maxDiffPixelRatio: 0.05,
    })
  })

  test('list skeleton', async ({ page }) => {
    await gotoStory(page, 'components-loading-state--list-skeleton')
    await expect(page).toHaveScreenshot('loading-list-skeleton.png', {
      maxDiffPixelRatio: 0.05,
    })
  })
})

test.describe('Error State Component', () => {
  test('basic error', async ({ page }) => {
    await gotoStory(page, 'components-error-state--basic')
    await expect(page).toHaveScreenshot('error-basic.png')
  })

  test('network error', async ({ page }) => {
    await gotoStory(page, 'components-error-state--network-error')
    await expect(page).toHaveScreenshot('error-network.png')
  })

  test('server error', async ({ page }) => {
    await gotoStory(page, 'components-error-state--server-error')
    await expect(page).toHaveScreenshot('error-server.png')
  })

  test('inline error', async ({ page }) => {
    await gotoStory(page, 'components-error-state--inline')
    await expect(page).toHaveScreenshot('error-inline.png')
  })
})

test.describe('Card Component', () => {
  test('default card', async ({ page }) => {
    await gotoStory(page, 'components-card--default')
    await expect(page).toHaveScreenshot('card-default.png')
  })

  test('card with header', async ({ page }) => {
    await gotoStory(page, 'components-card--with-header')
    await expect(page).toHaveScreenshot('card-with-header.png')
  })

  test('card with footer', async ({ page }) => {
    await gotoStory(page, 'components-card--with-footer')
    await expect(page).toHaveScreenshot('card-with-footer.png')
  })
})

test.describe('Dialog Component', () => {
  test('basic dialog', async ({ page }) => {
    await gotoStory(page, 'components-dialog--basic')
    
    // Open dialog
    await page.click('button:has-text("Open Dialog")')
    await page.waitForSelector('[role="dialog"]')
    
    await expect(page).toHaveScreenshot('dialog-basic.png')
  })

  test('dialog with form', async ({ page }) => {
    await gotoStory(page, 'components-dialog--with-form')
    
    await page.click('button:has-text("Open")')
    await page.waitForSelector('[role="dialog"]')
    
    await expect(page).toHaveScreenshot('dialog-with-form.png')
  })
})

test.describe('Dark Mode', () => {
  test('button in dark mode', async ({ page }) => {
    // Add dark class to root
    await gotoStory(page, 'components-button--primary')
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(200)
    
    await expect(page).toHaveScreenshot('button-primary-dark.png')
  })

  test('card in dark mode', async ({ page }) => {
    await gotoStory(page, 'components-card--default')
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(200)
    
    await expect(page).toHaveScreenshot('card-default-dark.png')
  })
})

test.describe('Responsive Design', () => {
  test('button on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await gotoStory(page, 'components-button--primary')
    await expect(page).toHaveScreenshot('button-primary-mobile.png')
  })

  test('card on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await gotoStory(page, 'components-card--with-header')
    await expect(page).toHaveScreenshot('card-header-tablet.png')
  })
})

test.describe('Interactive States', () => {
  test('button hover state', async ({ page }) => {
    await gotoStory(page, 'components-button--primary')
    const button = await page.locator('button').first()
    await button.hover()
    await page.waitForTimeout(100) // Wait for hover transition
    
    await expect(page).toHaveScreenshot('button-hover.png')
  })

  test('button focus state', async ({ page }) => {
    await gotoStory(page, 'components-button--primary')
    const button = await page.locator('button').first()
    await button.focus()
    await page.waitForTimeout(100)
    
    await expect(page).toHaveScreenshot('button-focus.png')
  })

  test('input filled state', async ({ page }) => {
    await gotoStory(page, 'components-input--default')
    const input = await page.locator('input').first()
    await input.fill('Test input value')
    await page.waitForTimeout(100)
    
    await expect(page).toHaveScreenshot('input-filled.png')
  })
})
