/**
 * CSV Export Utility
 * Wave-2: Analytics Dashboard CSV export functionality
 */

export interface CSVExportOptions {
  filename?: string
  delimiter?: string
  includeHeaders?: boolean
}

/**
 * Convert array of objects to CSV string
 */
export function convertToCSV<T extends Record<string, unknown>>(
  data: T[],
  options: CSVExportOptions = {}
): string {
  if (data.length === 0) return ''

  const { delimiter = ',', includeHeaders = true } = options

  // Get headers from first object (safe under strict index access)
  const first = data[0]!
  const headers = Object.keys(first)

  // Escape CSV values
  const escapeValue = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    // Escape quotes and wrap in quotes if contains delimiter, newline, or quote
    if (str.includes(delimiter) || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  // Build CSV rows
  const rows: string[] = []

  if (includeHeaders) {
    rows.push(headers.map(escapeValue).join(delimiter))
  }

  data.forEach((row) => {
    const values = headers.map((header) => escapeValue(row[header as keyof typeof row]))
    rows.push(values.join(delimiter))
  })

  return rows.join('\n')
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string = 'export.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')

  if (link.download !== undefined) {
    // Modern browsers
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

/**
 * Export data to CSV and download
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename?: string,
  options?: CSVExportOptions
): void {
  const csvContent = convertToCSV(data, options)
  const finalFilename = filename || `export-${new Date().toISOString().split('T')[0]}.csv`
  downloadCSV(csvContent, finalFilename)
}
