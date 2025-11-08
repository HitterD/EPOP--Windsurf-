/**
 * FE-Perf-4: Dynamic imports for heavy modules
 * Reduces initial bundle size and improves LCP
 */

import dynamic from 'next/dynamic'
import { type ComponentType } from 'react'

/**
 * Loading fallback component
 */
const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
)

/**
 * Heavy table components - ~50KB
 */
export const DynamicTanStackTable = dynamic(
  () => import('@tanstack/react-table').then((mod) => mod as unknown as ComponentType),
  { loading: () => <LoadingFallback />, ssr: false }
)

/**
 * Rich text editor - ~120KB
 */
export const DynamicTiptapEditor = dynamic(
  () => import('@tiptap/react').then(mod => ({ default: mod.EditorContent })),
  { loading: () => <LoadingFallback />, ssr: false }
)

/**
 * Charts library - ~80KB
 */
export const DynamicRechartsBarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart })),
  { loading: () => <LoadingFallback />, ssr: false }
)

export const DynamicRechartsLineChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart })),
  { loading: () => <LoadingFallback />, ssr: false }
)

export const DynamicRechartsAreaChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.AreaChart })),
  { loading: () => <LoadingFallback />, ssr: false }
)

/**
 * PDF viewer - ~200KB
 */
export const DynamicPDFViewer = dynamic(
  () => import('react-pdf').then(mod => ({ default: mod.Document })),
  { loading: () => <LoadingFallback />, ssr: false }
)

/**
 * Calendar/Date picker - ~40KB
 */
export const DynamicBigCalendar = dynamic(
  () => import('react-big-calendar').then(mod => ({ default: mod.Calendar })),
  { loading: () => <LoadingFallback />, ssr: false }
)

/**
 * Gantt chart (when implemented) - estimated ~100KB
 */
export const DynamicGanttChart = dynamic(
  () => import('@/features/projects/components/gantt-chart').then(mod => ({ default: mod.GanttChart })),
  { loading: () => <LoadingFallback />, ssr: false }
)

/**
 * File preview modal - ~60KB
 */
export const DynamicFilePreviewModal = dynamic(
  () => import('@/features/files/components/file-preview-modal').then(mod => ({ default: mod.FilePreviewModal })),
  { loading: () => <LoadingFallback />, ssr: false }
)

/**
 * Admin pages - ~30KB each
 */
export const DynamicAuditTrailViewer = dynamic(
  () => import('@/features/directory/components/audit-trail-viewer').then(mod => ({ default: mod.AuditTrailViewer })),
  { loading: () => <LoadingFallback />, ssr: false }
)

export const DynamicBulkImportWizard = dynamic(
  () => import('@/features/admin/components/bulk-import-wizard').then(mod => ({ default: mod.BulkImportWizard })),
  { loading: () => <LoadingFallback />, ssr: false }
)

/**
 * Storybook (development only) - ~500KB
 */
export const DynamicStorybookPreview = dynamic(
  () => import('@storybook/react').then((mod) => mod as unknown as ComponentType),
  { loading: () => <LoadingFallback />, ssr: false }
)

/**
 * Helper function to create dynamic import with custom loading
 */
export function createDynamicImport<P = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    loading?: (loadingProps: Record<string, unknown>) => JSX.Element | null
    ssr?: boolean
  }
) {
  return dynamic(importFn, {
    loading: options?.loading ?? (() => <LoadingFallback />),
    ssr: options?.ssr ?? false,
  })
}

/**
 * Analytics components
 */
export const DynamicActivityTrendChart = dynamic(
  () => import('@/features/analytics/components/activity-trend-chart').then(mod => ({ default: mod.ActivityTrendChart })),
  { loading: () => <LoadingFallback />, ssr: false }
)

export const DynamicMessageVolumeChart = dynamic(
  () => import('@/features/analytics/components/message-volume-chart').then(mod => ({ default: mod.MessageVolumeChart })),
  { loading: () => <LoadingFallback />, ssr: false }
)

export const DynamicTaskCompletionChart = dynamic(
  () => import('@/features/analytics/components/task-completion-chart').then(mod => ({ default: mod.TaskCompletionChart })),
  { loading: () => <LoadingFallback />, ssr: false }
)

export const DynamicResponseTimeChart = dynamic(
  () => import('@/features/analytics/components/response-time-chart').then(mod => ({ default: mod.ResponseTimeChart })),
  { loading: () => <LoadingFallback />, ssr: false }
)

export const DynamicDetailedMetricsTable = dynamic(
  () => import('@/features/analytics/components/detailed-metrics-table').then(mod => ({ default: mod.DetailedMetricsTable })),
  { loading: () => <LoadingFallback />, ssr: false }
)
