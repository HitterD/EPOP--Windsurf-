'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { BulkImportMapping } from '@/types'

interface BulkImportMappingStepProps {
  file: File
  entityType: 'users' | 'contacts'
  onComplete: (mapping: BulkImportMapping) => void
  onBack: () => void
}

const fieldOptions = [
  { value: 'email', label: 'Email', required: true },
  { value: 'firstName', label: 'First Name', required: true },
  { value: 'lastName', label: 'Last Name', required: true },
  { value: 'title', label: 'Job Title', required: false },
  { value: 'department', label: 'Department', required: false },
  { value: 'extension', label: 'Extension', required: false },
  { value: 'unitPath', label: 'Unit Path', required: false },
  { value: '_ignore', label: '(Ignore this column)', required: false },
]

export function BulkImportMappingStep({
  file,
  entityType,
  onComplete,
  onBack,
}: BulkImportMappingStepProps) {
  const [csvColumns, setCsvColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<BulkImportMapping>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const parseCSVHeaders = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const text = await file.text()
      const lines = text.split('\n')
      if (lines.length === 0) {
        throw new Error('CSV file is empty')
      }

      const headerLine = lines[0] ?? ''
      const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
      setCsvColumns(headers)

      const autoMapping: BulkImportMapping = {}
      headers.forEach((header) => {
        const lowerHeader = header.toLowerCase()
        if (lowerHeader.includes('email')) autoMapping[header] = 'email'
        else if (lowerHeader.includes('first') && lowerHeader.includes('name')) autoMapping[header] = 'firstName'
        else if (lowerHeader.includes('last') && lowerHeader.includes('name')) autoMapping[header] = 'lastName'
        else if (lowerHeader.includes('title') || lowerHeader.includes('position')) autoMapping[header] = 'title'
        else if (lowerHeader.includes('department') || lowerHeader.includes('dept')) autoMapping[header] = 'department'
        else if (lowerHeader.includes('extension') || lowerHeader.includes('ext')) autoMapping[header] = 'extension'
        else if (lowerHeader.includes('unit') || lowerHeader.includes('path')) autoMapping[header] = 'unitPath'
        else autoMapping[header] = '_ignore'
      })

      setMapping(autoMapping)
    } catch (err: unknown) {
      const msg = (err && typeof (err as { message?: unknown }).message === 'string')
        ? String((err as { message: string }).message)
        : 'Failed to parse CSV headers'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [file])

  useEffect(() => {
    parseCSVHeaders()
  }, [parseCSVHeaders])

  const handleMappingChange = (csvColumn: string, field: string) => {
    setMapping((prev) => ({
      ...prev,
      [csvColumn]: field,
    }))
  }

  const isValid = () => {
    const requiredFields = fieldOptions.filter((f) => f.required).map((f) => f.value)
    const mappedFields = Object.values(mapping).filter((v) => v !== '_ignore')
    return requiredFields.every((field) => mappedFields.includes(field))
  }

  const getMissingFields = () => {
    const requiredFields = fieldOptions.filter((f) => f.required).map((f) => f.value)
    const mappedFields = Object.values(mapping).filter((v) => v !== '_ignore')
    return requiredFields.filter((field) => !mappedFields.includes(field))
  }

  const handleNext = () => {
    if (isValid()) {
      onComplete(mapping)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Parsing CSV headers...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
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

  const valid = isValid()
  const missingFields = getMissingFields()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map CSV Columns</CardTitle>
        <CardDescription>
          Map your CSV columns to the corresponding fields. Auto-detection has been applied.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Status */}
        {valid ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              All required fields are mapped. You can proceed to preview.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Missing required fields: {missingFields.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Mapping Grid */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 font-medium text-sm pb-2 border-b">
            <div>CSV Column</div>
            <div>Maps To Field</div>
          </div>

          {csvColumns.map((column) => (
            <div key={column} className="grid grid-cols-2 gap-4 items-center">
              <Label className="font-normal truncate" title={column}>
                {column}
              </Label>
              <Select
                value={mapping[column] || '_ignore'}
                onValueChange={(value) => handleMappingChange(column, value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                      {option.required && <span className="text-red-500 ml-1">*</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {/* Preview First Row */}
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">Sample Data Preview:</p>
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <p>Based on your mapping, the first row will be imported as:</p>
            <code className="text-xs">
              {JSON.stringify(
                Object.entries(mapping)
                  .filter(([_, field]) => field !== '_ignore')
                  .reduce((acc, [col, field]) => ({ ...acc, [field]: `[${col} value]` }), {}),
                null,
                2
              )}
            </code>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={!valid}>
          Next: Preview Data
        </Button>
      </CardFooter>
    </Card>
  )
}
