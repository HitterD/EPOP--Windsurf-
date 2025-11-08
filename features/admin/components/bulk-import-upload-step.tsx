'use client'

import { useCallback, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, File, X, AlertCircle, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateBulkImportTemplate } from '@/lib/api/hooks/use-bulk-import'

interface BulkImportUploadStepProps {
  entityType: 'users' | 'contacts'
  onComplete: (file: File) => void
  onCancel?: () => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function BulkImportUploadStep({
  entityType,
  onComplete,
  onCancel,
}: BulkImportUploadStepProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    setError(null)

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]!
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File is too large. Maximum size is 5MB.')
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Please upload a CSV file.')
      } else {
        setError('Invalid file. Please try again.')
      }
      return
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      if (!file) return
      setSelectedFile(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
  })

  const handleRemove = () => {
    setSelectedFile(null)
    setError(null)
  }

  const handleNext = () => {
    if (selectedFile) {
      onComplete(selectedFile)
    }
  }

  const handleDownloadTemplate = () => {
    generateBulkImportTemplate()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload CSV File</CardTitle>
        <CardDescription>
          Upload a CSV file containing {entityType} data. Maximum file size is 5MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Download Template */}
        <Alert>
          <Download className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Don't have a CSV file? Download our template to get started.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </AlertDescription>
        </Alert>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Dropzone or Selected File */}
        {!selectedFile ? (
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
              isDragActive && 'border-primary bg-primary/5',
              !isDragActive && 'border-muted-foreground/25 hover:border-primary/50'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop the CSV file here' : 'Drag & drop your CSV file here'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse your files
            </p>
            <Button variant="outline">
              Choose File
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <File className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemove}
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* File Requirements */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium">File Requirements:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>File format: CSV (.csv)</li>
            <li>Maximum size: 5MB</li>
            <li>Must include header row with column names</li>
            <li>Required columns: email, firstName, lastName</li>
            <li>Optional columns: title, department, extension, unitPath</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleNext} disabled={!selectedFile}>
          Next: Map Columns
        </Button>
      </CardFooter>
    </Card>
  )
}
