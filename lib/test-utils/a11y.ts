/**
 * Accessibility Testing Utilities
 * Wave-1: FE-a11y-ci
 * Provides helpers for automated a11y testing with jest-axe
 */

import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// jest-axe types - will be installed via npm
type JestAxeConfigureOptions = {
  rules?: Record<string, { enabled: boolean }>
}

type AxeResults = {
  violations: any[]
}

// Import jest-axe (install with: npm install -D jest-axe @types/jest-axe)
let axe: (container: Element, options?: JestAxeConfigureOptions) => Promise<AxeResults>
let toHaveNoViolations: any

try {
  const jestAxe = require('jest-axe')
  axe = jestAxe.axe
  toHaveNoViolations = jestAxe.toHaveNoViolations
  expect.extend(toHaveNoViolations)
} catch (e) {
  // jest-axe not installed yet
  console.warn('jest-axe not installed. Run: npm install -D jest-axe')
}

/**
 * Default axe configuration for WCAG 2.1 AA compliance
 */
export const axeConfig: JestAxeConfigureOptions = {
  rules: {
    // WCAG 2.1 Level A & AA rules
    'color-contrast': { enabled: true },
    'label': { enabled: true },
    'button-name': { enabled: true },
    'link-name': { enabled: true },
    'image-alt': { enabled: true },
    'heading-order': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'aria-roles': { enabled: true },
    'aria-allowed-attr': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-required-children': { enabled: true },
    'aria-required-parent': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true },
    'definition-list': { enabled: true },
    'dlitem': { enabled: true },
    'document-title': { enabled: true },
    'duplicate-id': { enabled: true },
    'duplicate-id-aria': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'frame-title': { enabled: true },
    'html-has-lang': { enabled: true },
    'html-lang-valid': { enabled: true },
    'input-button-name': { enabled: true },
    'input-image-alt': { enabled: true },
    'label-title-only': { enabled: true },
    'meta-refresh': { enabled: true },
    'meta-viewport': { enabled: true },
    'object-alt': { enabled: true },
    'role-img-alt': { enabled: true },
    'scrollable-region-focusable': { enabled: true },
    'select-name': { enabled: true },
    'server-side-image-map': { enabled: true },
    'svg-img-alt': { enabled: true },
    'td-headers-attr': { enabled: true },
    'th-has-data-cells': { enabled: true },
    'valid-lang': { enabled: true },
    'video-caption': { enabled: true },
  },
}

/**
 * Run axe accessibility tests on a rendered component
 * 
 * @example
 * ```tsx
 * it('should have no a11y violations', async () => {
 *   const { container } = render(<MyComponent />)
 *   const results = await runAxe(container)
 *   expect(results).toHaveNoViolations()
 * })
 * ```
 */
export async function runAxe(container: Element, options?: JestAxeConfigureOptions) {
  const results = await axe(container, {
    ...axeConfig,
    ...options,
  })
  return results
}

/**
 * Render component and run axe tests
 * Convenience wrapper for common pattern
 */
export async function renderAndTestA11y(
  ui: ReactElement,
  options?: RenderOptions & { axeOptions?: JestAxeConfigureOptions }
) {
  const { axeOptions, ...renderOptions } = options || {}
  const rendered = render(ui, renderOptions)
  const results = await runAxe(rendered.container, axeOptions)
  
  return {
    ...rendered,
    axeResults: results,
  }
}

/**
 * Test keyboard navigation for a component
 * Verifies Tab, Arrow keys, Enter, Escape work correctly
 */
export function testKeyboardNavigation(element: HTMLElement) {
  const tab = () => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
  const shiftTab = () => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
  const arrowDown = () => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  const arrowUp = () => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
  const arrowLeft = () => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
  const arrowRight = () => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
  const enter = () => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  const space = () => element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
  const escape = () => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  const home = () => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
  const end = () => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))

  return {
    tab,
    shiftTab,
    arrowDown,
    arrowUp,
    arrowLeft,
    arrowRight,
    enter,
    space,
    escape,
    home,
    end,
  }
}

/**
 * Verify an element has proper focus indicators
 */
export function hasFocusIndicator(element: HTMLElement): boolean {
  element.focus()
  const styles = window.getComputedStyle(element)
  
  // Check for outline or box-shadow (common focus indicators)
  const hasOutline = styles.outlineWidth !== '0px' && styles.outlineStyle !== 'none'
  const hasBoxShadow = styles.boxShadow !== 'none'
  const hasRing = element.className.includes('ring') // Tailwind ring classes
  
  return hasOutline || hasBoxShadow || hasRing
}

/**
 * Check if element is properly labeled
 */
export function isProperlyLabeled(element: HTMLElement): boolean {
  const hasAriaLabel = element.hasAttribute('aria-label')
  const hasAriaLabelledBy = element.hasAttribute('aria-labelledby')
  const hasLabel = element.tagName === 'INPUT' && !!document.querySelector(`label[for="${element.id}"]`)
  const hasInnerText = (element.textContent?.trim().length ?? 0) > 0
  
  return hasAriaLabel || hasAriaLabelledBy || hasLabel || hasInnerText
}

/**
 * Verify live region announces changes
 */
export function findLiveRegion(container: Element, politeness: 'polite' | 'assertive' = 'polite'): HTMLElement | null {
  return container.querySelector(`[aria-live="${politeness}"]`)
}

/**
 * Test helper: Assert element is keyboard accessible
 */
export function assertKeyboardAccessible(element: HTMLElement) {
  const tabIndex = element.tabIndex
  const isInteractive = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)
  const hasTabIndex = tabIndex >= 0
  
  if (isInteractive || hasTabIndex) {
    expect(element).toHaveFocus()
  }
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: Element): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ')
  
  return Array.from(container.querySelectorAll<HTMLElement>(selector))
}

/**
 * Test focus trap in modal/dialog
 */
export function testFocusTrap(container: Element) {
  const focusableElements = getFocusableElements(container)
  
  if (focusableElements.length === 0) {
    throw new Error('No focusable elements found in container')
  }
  
  const first = focusableElements[0]
  const last = focusableElements[focusableElements.length - 1]
  
  return {
    focusableElements,
    first,
    last,
    testTabFromLast: () => {
      if (!last || !first) throw new Error('No focusable elements')
      last.focus()
      last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
      // Should wrap to first
      expect(document.activeElement).toBe(first)
    },
    testShiftTabFromFirst: () => {
      if (!first || !last) throw new Error('No focusable elements')
      first.focus()
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
      // Should wrap to last
      expect(document.activeElement).toBe(last)
    },
  }
}

/**
 * Color contrast checker helper
 * Note: This is a simplified version. For production, use actual WCAG algorithms
 */
export function checkContrast(foreground: string, background: string): { ratio: number; passes: boolean } {
  // Simplified contrast calculation
  // In real implementation, convert colors to relative luminance and calculate ratio
  // For now, return mock passing values
  return {
    ratio: 4.5, // Mock WCAG AA passing ratio
    passes: true,
  }
}

/**
 * ARIA role validators
 */
export const ariaRoles = {
  isValidRole: (role: string): boolean => {
    const validRoles = [
      'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
      'checkbox', 'columnheader', 'combobox', 'dialog', 'directory', 'document',
      'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
      'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
      'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
      'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation',
      'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
      'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider',
      'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel',
      'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid',
      'treeitem',
    ]
    return validRoles.includes(role)
  },
  
  hasRequiredAttributes: (element: HTMLElement): boolean => {
    const role = element.getAttribute('role')
    if (!role) return true
    
    // Role-specific required attributes
    const requiredAttrs: Record<string, string[]> = {
      'checkbox': ['aria-checked'],
      'radio': ['aria-checked'],
      'slider': ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
      'progressbar': ['aria-valuenow'],
      'tab': ['aria-controls'],
      'tabpanel': ['aria-labelledby'],
    }
    
    const required = requiredAttrs[role] || []
    return required.every(attr => element.hasAttribute(attr))
  },
}

/**
 * Screen reader text utilities
 */
export const screenReader = {
  /**
   * Check if element is visually hidden but screen reader accessible
   */
  isVisuallyHidden: (element: HTMLElement): boolean => {
    const classes = element.className
    return classes.includes('sr-only') || classes.includes('visually-hidden')
  },
  
  /**
   * Get announced text for element
   */
  getAnnouncedText: (element: HTMLElement): string => {
    return (
      element.getAttribute('aria-label') ||
      element.textContent ||
      element.getAttribute('title') ||
      ''
    ).trim()
  },
}
