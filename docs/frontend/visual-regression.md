# Visual Regression Testing Guide

**Wave-4: FE-vr-snapshot**  
**Status:** ✅ Implemented  
**Last Updated:** 2025-11-07

---

## Overview

Self-hosted visual regression testing using Playwright to catch unintended UI changes without external SaaS dependencies.

---

## Quick Start

### Run Visual Tests Locally

```bash
# Run all visual tests
npm run test:visual

# Update snapshots after intentional changes
npm run test:visual:update

# Open interactive UI
npm run test:visual:ui
```

### CI Integration

Visual regression tests automatically run on PRs that modify:
- Components (`components/**`)
- Styles (`tailwind.config.ts`, `app/globals.css`)
- Stories (`stories/**`)

---

## Architecture

### Stack

- **Playwright**: Browser automation and screenshot comparison
- **Storybook**: Isolated component rendering
- **Self-hosted**: All snapshots stored in git, no external services

### File Structure

```
tests/
  visual/
    components.visual.spec.ts    # Visual tests
    snapshots/                    # Baseline screenshots
      components.visual.spec.ts-snapshots/
        button-default-Desktop-Chrome.png
        button-hover-Desktop-Chrome.png
        ...
playwright.visual.config.ts      # Configuration
.github/workflows/
  visual-regression.yml          # CI workflow
```

---

## Writing Visual Tests

### Basic Test

```typescript
import { test, expect } from '@playwright/test'

test('button renders correctly', async ({ page }) => {
  // Navigate to Storybook story
  await page.goto('/iframe.html?id=components-button--primary')
  await page.waitForLoadState('networkidle')
  
  // Take screenshot and compare
  await expect(page).toHaveScreenshot('button-primary.png')
})
```

### Test with Interaction

```typescript
test('button hover state', async ({ page }) => {
  await page.goto('/iframe.html?id=components-button--primary')
  await page.waitForLoadState('networkidle')
  
  // Hover over button
  const button = await page.locator('button').first()
  await button.hover()
  await page.waitForTimeout(100) // Wait for transition
  
  await expect(page).toHaveScreenshot('button-hover.png')
})
```

### Test Dark Mode

```typescript
test('card in dark mode', async ({ page }) => {
  await page.goto('/iframe.html?id=components-card--default')
  
  // Enable dark mode
  await page.evaluate(() => {
    document.documentElement.classList.add('dark')
  })
  await page.waitForTimeout(200)
  
  await expect(page).toHaveScreenshot('card-dark.png')
})
```

### Test Responsive Design

```typescript
test('card on mobile', async ({ page }) => {
  // Set viewport to mobile size
  await page.setViewportSize({ width: 375, height: 667 })
  
  await page.goto('/iframe.html?id=components-card--default')
  await page.waitForLoadState('networkidle')
  
  await expect(page).toHaveScreenshot('card-mobile.png')
})
```

---

## Configuration

### Snapshot Comparison Settings

Located in `playwright.visual.config.ts`:

```typescript
expect: {
  toHaveScreenshot: {
    // Allow small differences (anti-aliasing, font rendering)
    maxDiffPixels: 100,
    maxDiffPixelRatio: 0.01, // 1%
    
    // Disable animations for consistent screenshots
    animations: 'disabled',
    
    // Pixel comparison threshold (0-1)
    threshold: 0.2,
  },
}
```

### Browser Coverage

Tests run across multiple browsers:

- **Desktop Chrome** (primary)
- **Desktop Firefox**
- **Mobile Safari** (iPhone 13)

Each browser generates separate baseline screenshots.

---

## CI Workflow

### On Pull Request

1. **Install dependencies** and Playwright browsers
2. **Build Storybook** for component isolation
3. **Run visual tests** across all configured browsers
4. **Upload artifacts**:
   - Full test report
   - Failed screenshot diffs
5. **Comment on PR** with test results

### PR Comment Example

```markdown
## 🎨 Visual Regression Test Results

**Status:** ❌ Failed

| Metric | Count |
|--------|-------|
| Total Tests | 45 |
| ✅ Passed | 42 |
| ❌ Failed | 3 |

### Failed Tests

Visual differences were detected. Please review the test report artifacts.

**To update snapshots locally:**
```bash
npm run test:visual:update
```

[📊 View full report](...)
```

---

## Updating Snapshots

### Locally

```bash
# Update all snapshots
npm run test:visual:update

# Update specific test
npx playwright test --config=playwright.visual.config.ts components.visual.spec.ts -g "button" --update-snapshots
```

### In CI (via PR label)

1. Add label `update-snapshots` to PR
2. CI automatically updates snapshots and commits
3. Label is removed after update
4. Review and merge the snapshot updates

---

## Best Practices

### ✅ Do's

- **Test component states**: default, hover, focus, disabled, loading
- **Test themes**: light mode, dark mode
- **Test viewports**: desktop, tablet, mobile
- **Use semantic selectors**: `page.getByRole('button')` over `page.locator('.btn')`
- **Wait for stability**: fonts, images, animations
- **Keep tests isolated**: use Storybook stories, not full pages

### ❌ Don'ts

- **Don't test dynamic content**: timestamps, user-specific data
- **Don't test animations**: disable them or use higher tolerance
- **Don't commit huge diffs**: review carefully before updating
- **Don't test external content**: images from CDN, ads
- **Don't over-test**: focus on critical UI components

---

## Handling Failures

### When Tests Fail

1. **Download artifacts** from CI (failed screenshots + diffs)
2. **Review visual diffs**:
   - Red areas: removed pixels
   - Green areas: added pixels
   - Yellow areas: changed pixels
3. **Determine if intentional**:
   - ✅ Intentional change → update snapshots
   - ❌ Unintended regression → fix the code
4. **Update locally**: `npm run test:visual:update`
5. **Commit updated snapshots**: `git add tests/visual/snapshots`

### Reviewing Diffs

```bash
# Open interactive UI to review diffs
npm run test:visual:ui

# Navigate to failed test
# Click "Show diff" to see visual comparison
# Decide: Accept new snapshot or Fix issue
```

---

## Troubleshooting

### Flaky Tests (Random Failures)

**Causes:**
- Font loading timing
- Animation not fully disabled
- Network-dependent content

**Solutions:**
```typescript
// Wait for fonts
await page.evaluate(() => document.fonts.ready)

// Longer settling time
await page.waitForTimeout(500)

// Higher tolerance
await expect(page).toHaveScreenshot('component.png', {
  maxDiffPixelRatio: 0.05, // 5% instead of 1%
})
```

### Snapshots Differ Across Environments

**Causes:**
- Different OS (Windows vs Linux font rendering)
- Different screen DPI
- Playwright version mismatch

**Solutions:**
- Always use same OS for snapshots (CI uses Ubuntu)
- Update snapshots in CI, not locally
- Pin Playwright version in package.json

### Large Snapshot Diffs

**Causes:**
- Global CSS changes
- Theme changes
- Component library updates

**Solutions:**
- Batch review all diffs
- Use `--update-snapshots` to regenerate all
- Consider temporary higher tolerance during refactor

---

## Performance

### Optimization Tips

```typescript
// 1. Test component, not full page
await page.goto('/iframe.html?id=story-id') // ✅ Fast

// 2. Reuse page context
test.describe('Button variants', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/iframe.html?id=components-button--default')
  })
  
  test('variant 1', async ({ page }) => { ... })
  test('variant 2', async ({ page }) => { ... })
})

// 3. Parallel execution
test.describe.configure({ mode: 'parallel' })
```

### Reducing Snapshot Size

- **Crop to component**: Screenshot specific elements
- **Optimize PNG**: Use lossy compression (not recommended)
- **Skip redundant tests**: Don't test every minor variant

---

## Integration with Storybook

### Adding Stories for Visual Tests

```tsx
// Button.stories.ts
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    // Ensure consistent viewport
    viewport: {
      defaultViewport: 'responsive',
    },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: {
    children: 'Click me',
    variant: 'default',
  },
}

export const Hover: Story = {
  args: {
    children: 'Hover me',
  },
  parameters: {
    // Auto-hover for testing
    pseudo: { hover: true },
  },
}
```

---

## Metrics

### Coverage Goals

- [ ] All reusable UI components (`components/ui/*`)
- [ ] Critical feature components (chat, file upload, calendar)
- [ ] Empty/Loading/Error states
- [ ] Light + Dark mode variants
- [ ] Mobile + Desktop viewports

### Current Coverage

```
components/ui/
  ✅ button
  ✅ card
  ✅ dialog
  ✅ empty-state
  ✅ loading-state
  ✅ error-state
  ⏳ input
  ⏳ select
  ⏳ textarea
  ⏳ tooltip
```

---

## Alternatives Considered

### Why Not Chromatic / Percy?

**Pros of SaaS:**
- Hosted snapshot storage
- Beautiful diff UI
- Managed infrastructure

**Cons (why we chose self-hosted):**
- ❌ External dependency
- ❌ Monthly costs
- ❌ Data leaves infrastructure
- ❌ Vendor lock-in

### Self-Hosted Benefits

- ✅ Full control
- ✅ No external costs
- ✅ Data stays internal
- ✅ Git-based workflow
- ✅ Works offline

---

## Future Enhancements

### P2 Improvements

1. **Accessibility annotations**: Visual indicators for focus order, ARIA
2. **Performance budgets**: Warn on layout shift in screenshots
3. **Cross-browser comparison**: Highlight browser-specific differences
4. **Automatic grouping**: Organize diffs by component/feature
5. **Snapshot pruning**: Auto-remove unused snapshots

---

## Resources

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Storybook Testing](https://storybook.js.org/docs/react/writing-tests/visual-testing)
- [Fighting Flaky Tests](https://playwright.dev/docs/test-timeouts)

---

**Status:** Wave-4 Complete ✅  
**Next:** Expand coverage to all UI components
