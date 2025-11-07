# Accessibility Testing Guide

**Wave-1: FE-a11y-ci**  
**Status:** ✅ Implemented  
**Last Updated:** 2025-11-07

---

## Overview

Comprehensive automated and manual accessibility testing ensuring WCAG 2.1 AA compliance across all components.

---

## Automated Testing with jest-axe

### Installation

```bash
npm install -D jest-axe
```

### Basic Usage

```tsx
import { render } from '@testing-library/react'
import { runAxe } from '@/lib/test-utils/a11y'

describe('MyComponent accessibility', () => {
  it('should have no a11y violations', async () => {
    const { container } = render(<MyComponent />)
    const results = await runAxe(container)
    expect(results).toHaveNoViolations()
  })
})
```

### Test Utilities

Located in `lib/test-utils/a11y.ts`:

#### `runAxe(container, options?)`

Run axe accessibility audit on a rendered component.

```tsx
const results = await runAxe(container, {
  rules: {
    'color-contrast': { enabled: true },
    'label': { enabled: true },
  }
})
expect(results).toHaveNoViolations()
```

#### `renderAndTestA11y(ui, options?)`

Convenience wrapper that renders and tests in one call.

```tsx
const { container, axeResults } = await renderAndTestA11y(<MyComponent />)
expect(axeResults).toHaveNoViolations()
```

#### `testKeyboardNavigation(element)`

Test keyboard interaction patterns.

```tsx
const { tab, enter, escape, arrowDown } = testKeyboardNavigation(element)

tab() // Simulate Tab key
arrowDown() // Simulate Arrow Down
enter() // Simulate Enter
```

#### `getFocusableElements(container)`

Get all keyboard-focusable elements.

```tsx
const focusable = getFocusableElements(container)
expect(focusable.length).toBeGreaterThan(0)
expect(focusable[0]).toHaveFocus()
```

#### `testFocusTrap(container)`

Test modal/dialog focus trap behavior.

```tsx
const { testTabFromLast, testShiftTabFromFirst } = testFocusTrap(modalContainer)
testTabFromLast() // Should wrap to first element
testShiftTabFromFirst() // Should wrap to last element
```

---

## VirtualList Accessibility

### Enhanced Features

The `VirtualList` component now includes comprehensive a11y support:

```tsx
<VirtualList
  items={items}
  row={(item, index) => <ItemRow item={item} />}
  ariaLabel="Message list"
  role="list"
  isLoading={loading}
  announceRange={true}
/>
```

### ARIA Attributes

| Attribute | Purpose |
|-----------|---------|
| `aria-label` | Accessible name for the list |
| `aria-setsize` | Total number of items |
| `aria-posinset` | Position of each item |
| `aria-busy` | Loading state announcement |
| `aria-live` | Dynamic content updates |

### Screen Reader Announcements

- **Range announcement**: "Showing items 1 to 20 of 100"
- **Loading state**: "Loading" / "Loaded"
- **Keyboard hint**: "Use arrow keys to scroll through the list"

### Test Example

```tsx
it('should have no a11y violations in virtualized list', async () => {
  const { container } = render(
    <VirtualList 
      items={data} 
      row={renderRow}
      ariaLabel="Search results"
    />
  )
  
  const results = await runAxe(container)
  expect(results).toHaveNoViolations()
  
  const list = screen.getByRole('list')
  expect(list).toHaveAttribute('aria-setsize', `${data.length}`)
})
```

---

## CI Integration

### GitHub Actions Workflow

Added to `.github/workflows/frontend-ci.yml`:

```yaml
- name: Accessibility tests (jest-axe)
  run: npm test -- --testNamePattern="a11y|accessibility" --passWithNoTests
  continue-on-error: false
```

### Running Tests Locally

```bash
# Run all a11y tests
npm test -- --testNamePattern="a11y"

# Run specific component a11y test
npm test -- VirtualList.a11y.test

# Watch mode
npm test -- --testNamePattern="a11y" --watch
```

---

## Writing Accessibility Tests

### Component Test Template

```tsx
import { render, screen } from '@testing-library/react'
import { runAxe, testKeyboardNavigation } from '@/lib/test-utils/a11y'
import MyComponent from '../MyComponent'

describe('MyComponent accessibility', () => {
  it('should have no a11y violations', async () => {
    const { container } = render(<MyComponent />)
    const results = await runAxe(container)
    expect(results).toHaveNoViolations()
  })

  it('should be keyboard accessible', () => {
    render(<MyComponent />)
    const button = screen.getByRole('button')
    
    button.focus()
    expect(button).toHaveFocus()
    
    const { enter } = testKeyboardNavigation(button)
    enter()
    // Assert expected behavior
  })

  it('should have proper ARIA attributes', () => {
    render(<MyComponent />)
    const element = screen.getByRole('button')
    
    expect(element).toHaveAttribute('aria-label')
    expect(element).not.toHaveAttribute('aria-hidden', 'true')
  })

  it('should announce state changes', () => {
    render(<MyComponent />)
    const liveRegion = screen.getByRole('status')
    
    expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    expect(liveRegion).toHaveTextContent('Expected announcement')
  })
})
```

### Form Component Test

```tsx
describe('Form accessibility', () => {
  it('should associate labels with inputs', () => {
    render(<MyForm />)
    
    const input = screen.getByLabelText('Email address')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'email')
  })

  it('should announce validation errors', async () => {
    render(<MyForm />)
    
    const submitButton = screen.getByRole('button', { name: /submit/i })
    submitButton.click()
    
    const errorMessage = await screen.findByRole('alert')
    expect(errorMessage).toHaveTextContent(/required/i)
  })

  it('should mark required fields', () => {
    render(<MyForm />)
    
    const requiredInput = screen.getByLabelText(/email.*required/i)
    expect(requiredInput).toHaveAttribute('aria-required', 'true')
  })
})
```

---

## Manual Testing Checklist

### Keyboard Navigation

- [ ] All interactive elements reachable via Tab
- [ ] Focus visible on all elements
- [ ] Esc closes modals/dialogs
- [ ] Arrow keys work in lists/menus
- [ ] Enter/Space activates buttons/links

### Screen Reader Testing

- [ ] Test with NVDA (Windows)
- [ ] Test with JAWS (Windows)
- [ ] Test with VoiceOver (macOS)
- [ ] All images have alt text
- [ ] Form labels announced
- [ ] Dynamic content changes announced

### Visual Checks

- [ ] Color contrast ≥ 4.5:1 (normal text)
- [ ] Color contrast ≥ 3:1 (large text)
- [ ] No information conveyed by color alone
- [ ] Text readable at 200% zoom
- [ ] No content loss on mobile

---

## Common Issues & Fixes

### Issue: Color Contrast Failure

```tsx
// ❌ Bad: Insufficient contrast
<span className="text-gray-400">Low contrast text</span>

// ✅ Good: Sufficient contrast
<span className="text-gray-700">High contrast text</span>
```

### Issue: Missing Button Label

```tsx
// ❌ Bad: No accessible name
<button><X /></button>

// ✅ Good: Has aria-label
<button aria-label="Close dialog"><X /></button>
```

### Issue: Keyboard Trap

```tsx
// ❌ Bad: Focus escapes modal
<div className="modal">
  <input />
  <button>Close</button>
</div>

// ✅ Good: Focus trapped
import { useFocusTrap } from '@/lib/hooks/use-keyboard-nav'

function Modal() {
  const trapRef = useFocusTrap(true)
  
  return (
    <div ref={trapRef} className="modal">
      <input />
      <button>Close</button>
    </div>
  )
}
```

### Issue: No Live Region for Dynamic Content

```tsx
// ❌ Bad: Silent update
<div>{message}</div>

// ✅ Good: Announced to screen readers
<div role="status" aria-live="polite">
  {message}
</div>
```

---

## Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [jest-axe Documentation](https://github.com/nickcolley/jest-axe)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Testing Library Accessibility](https://testing-library.com/docs/queries/byrole)

---

## Next Steps

1. **Add more component tests**: Cover all interactive components
2. **Visual regression**: Add Chromatic or Percy for visual a11y checks
3. **Performance**: Ensure a11y tests don't slow down CI
4. **Documentation**: Update component docs with a11y examples

---

**Status:** Wave-1 Complete ✅
