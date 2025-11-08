'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle2, AlertCircle, XCircle, Download } from 'lucide-react'
import { BulkImportMapping, BulkImportPreview } from '@/types'
import { useBulkImportDryRun, useBulkImport, exportErrorsToCSV } from '@/lib/api/hooks/use-bulk-import'
import { cn } from '@/lib/utils'

interface BulkImportPreviewStepProps {
  file: File
  mapping: BulkImportMapping
  entityType: 'users' | 'contacts'
  onComplete: (preview: BulkImportPreview) => void
  onBack: () => void
}

export function BulkImportPreviewStep({
  file,
  mapping,
  entityType,
  onComplete,
  onBack,
}: BulkImportPreviewStepProps) {
  const dryRun = useBulkImportDryRun()
  const actualImport = useBulkImport()

  useEffect(() => {
    // Run dry-run when file or mapping changes
    dryRun.mutate({ file, mapping })
  }, [dryRun, file, mapping])

  const handleImport = () => {
    if (dryRun.data) {
      actualImport.mutate(
        { file, mapping, skipInvalid: true },
        {
          onSuccess: (result) => {
            onComplete(dryRun.data)
          },
        }
      )
    }
  }

  const handleExportErrors = () => {
    if (dryRun.data) {
      const errors = dryRun.data.rows
        .filter((row) => !row.isValid)
        .flatMap((row) =>
          row.errors?.map((err) => ({
            row: row.row,
            ...(err.field ? { field: err.field } : {}),
            message: err.message,
          })) || []
        )
      exportErrorsToCSV(errors)
    }
  }

  if (dryRun.isPending) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Validating your data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (dryRun.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Validation Failed</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {dryRun.error.message || 'Failed to validate CSV file'}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const preview = dryRun.data
  if (!preview) return null

  const hasErrors = preview.invalid > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview & Validate</CardTitle>
        <CardDescription>
          Review validation results before importing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold">{preview.valid + preview.invalid}</div>
            <div className="text-sm text-muted-foreground">Total Rows</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {preview.valid}
            </div>
            <div className="text-sm text-muted-foreground">Valid</div>
          </div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {preview.invalid}
            </div>
            <div className="text-sm text-muted-foreground">Invalid</div>
          </div>
        </div>

        {/* Warnings/Errors */}
        {hasErrors ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {preview.invalid} row(s) have validation errors. You can skip invalid rows or go back to fix them.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportErrors}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Errors
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              All rows passed validation! You can proceed with the import.
            </AlertDescription>
          </Alert>
        )}

        {/* Preview Table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Preview (first 10 rows)</h4>
          </div>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Row</TableHead>
                  <TableHead className="w-12">Status</TableHead>
                  {preview.columns.map((col) => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.slice(0, 10).map((row) => (
                  <TableRow
                    key={row.row}
                    className={cn(!row.isValid && 'bg-red-50 dark:bg-red-950/10')}
                  >
                    <TableCell className="font-mono text-xs">{row.row}</TableCell>
                    <TableCell>
                      {row.isValid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                    {preview.columns.map((col) => (
                      <TableCell key={col} className="max-w-[200px] truncate">
                        {String(row.data[col] ?? '-')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {preview.rows.length > 10 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              ... and {preview.rows.length - 10} more rows
            </p>
          )}
        </div>

        {/* Error Details */}
        {hasErrors && (
          <div>
            <h4 className="text-sm font-medium mb-3">Validation Errors</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {preview.rows
                .filter((row) => !row.isValid)
                .slice(0, 5)
                .map((row) => (
                  <div key={row.row} className="text-sm p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div className="font-medium mb-1">Row {row.row}:</div>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {row.errors?.map((err, i) => (
                        <li key={i}>
                          {err.field && <strong>{err.field}:</strong>} {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={actualImport.isPending}>
          Back
        </Button>
        <Button
          onClick={handleImport}
          disabled={preview.valid === 0 || actualImport.isPending}
        >
          {actualImport.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Importing...
            </>
          ) : (
            `Import ${preview.valid} Valid Row${preview.valid !== 1 ? 's' : ''}`
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
