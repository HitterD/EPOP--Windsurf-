/**
 * VirtualList Accessibility Tests
 * Wave-1: FE-a11y-ci
 * Ensures virtualized lists are accessible to screen readers and keyboard users
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import 'jest-axe/extend-expect'
import { runAxe, testKeyboardNavigation, getFocusableElements } from '@/lib/test-utils/a11y'
import VirtualList from '../VirtualList'

describe('VirtualList accessibility', () => {
  const mockItems = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
  }))

  const renderRow = (item: typeof mockItems[0], index: number) => (
    <div data-testid={`item-${index}`}>
      <button>{item.name}</button>
    </div>
  )

  it('should have no a11y violations', async () => {
    const { container } = render(
      <VirtualList 
        items={mockItems} 
        row={renderRow}
        ariaLabel="Test list"
      />
    )

    const results = await runAxe(container)
    expect(results.violations.length).toBe(0)
  })

  it('should have proper ARIA attributes', () => {
    render(
      <VirtualList 
        items={mockItems} 
        row={renderRow}
        ariaLabel="Test items"
      />
    )

    const listContainer = screen.getByRole('list')
    expect(listContainer).toHaveAttribute('aria-label', 'Test items')
    expect(listContainer).toHaveAttribute('aria-setsize', '100')
  })

  it('should announce loading state', () => {
    const { rerender } = render(
      <VirtualList 
        items={mockItems} 
        row={renderRow}
        ariaLabel="Test items"
        isLoading={false}
      />
    )

    const listContainer = screen.getByRole('list')
    expect(listContainer).toHaveAttribute('aria-busy', 'false')

    rerender(
      <VirtualList 
        items={mockItems} 
        row={renderRow}
        ariaLabel="Test items"
        isLoading={true}
      />
    )

    expect(listContainer).toHaveAttribute('aria-busy', 'true')
  })

  it('should have screen reader live region', () => {
    render(
      <VirtualList 
        items={mockItems} 
        row={renderRow}
        ariaLabel="Test items"
      />
    )

    const liveRegion = screen.getByRole('status')
    expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
  })

  it('should be keyboard accessible', () => {
    const { container } = render(
      <VirtualList 
        items={mockItems} 
        row={renderRow}
        ariaLabel="Test items"
      />
    )

    const listContainer = screen.getByRole('list')
    expect(listContainer).toHaveAttribute('tabindex', '0')

    const focusable = getFocusableElements(container)
    expect(focusable.length).toBeGreaterThan(0)
  })

  it('should render list items with proper ARIA position', () => {
    render(
      <VirtualList 
        items={mockItems.slice(0, 10)} 
        row={renderRow}
        ariaLabel="Test items"
      />
    )

    const listitems = screen.getAllByRole('listitem')
    expect(listitems.length).toBeGreaterThan(0)
    
    // Check first item has proper position
    expect(listitems[0]).toHaveAttribute('aria-posinset', '1')
    expect(listitems[0]).toHaveAttribute('aria-setsize', '10')
  })

  it('should provide keyboard navigation hint', () => {
    render(
      <VirtualList 
        items={mockItems} 
        row={renderRow}
        ariaLabel="Test items"
      />
    )

    const hint = document.getElementById('virtuallist-hint')
    expect(hint).toBeInTheDocument()
    expect(hint).toHaveClass('sr-only')
    expect(hint).toHaveTextContent('Use arrow keys to scroll through the list')
  })

  it('should work with custom roles', async () => {
    const { container } = render(
      <VirtualList 
        items={mockItems} 
        row={renderRow}
        ariaLabel="Test items"
        role="feed"
      />
    )

    const feedContainer = screen.getByRole('feed')
    expect(feedContainer).toBeInTheDocument()

    const results = await runAxe(container)
    expect(results.violations.length).toBe(0)
  })

  it('should announce range when items are visible', async () => {
    jest.useFakeTimers()
    
    render(
      <VirtualList 
        items={mockItems} 
        row={renderRow}
        ariaLabel="Test items"
        announceRange={true}
      />
    )

    // Fast-forward past debounce
    jest.advanceTimersByTime(600)

    const liveRegion = screen.getByRole('status')
    expect(liveRegion.textContent).toMatch(/Showing items \d+ to \d+ of 100/)

    jest.useRealTimers()
  })
})
