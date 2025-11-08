"use client"

import * as React from "react"
import Image from "next/image"
import { useDropzone, type DropzoneOptions, type FileRejection } from "react-dropzone"
import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Progress } from "./progress"

interface FileDropzoneProps extends Omit<DropzoneOptions, "onDrop"> {
  onFilesSelected?: (files: File[]) => void
  onFilesRejected?: (files: File[]) => void
  className?: string
  showPreview?: boolean
  maxFiles?: number
  maxSize?: number // in bytes
}

interface FileWithPreview extends File {
  preview?: string
  progress?: number
  status?: "uploading" | "success" | "error"
  error?: string
}

export function FileDropzone({
  onFilesSelected,
  onFilesRejected,
  className,
  showPreview = true,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB default
  accept,
  ...props
}: FileDropzoneProps) {
  const [files, setFiles] = React.useState<FileWithPreview[]>([])

  const onDrop = React.useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (acceptedFiles?.length) {
        const newFiles = acceptedFiles.map((file) =>
          Object.assign(file, {
            preview: URL.createObjectURL(file),
          })
        )
        setFiles((prev) => [...prev, ...newFiles])
        onFilesSelected?.(acceptedFiles)
      }

      if (rejectedFiles?.length) {
        onFilesRejected?.(rejectedFiles.map((r) => r.file as File))
      }
    },
    [onFilesSelected, onFilesRejected]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    ...(accept ? { accept } : {}),
  })

  const removeFile = React.useCallback((name: string) => {
    setFiles((files) => files.filter((file) => file.name !== name))
  }, [])

  React.useEffect(() => {
    // Revoke the data URIs to avoid memory leaks
    return () => {
      files.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview)
        }
      })
    }
  }, [files])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center w-full px-6 py-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Upload
            className={cn(
              "h-10 w-10 transition-colors",
              isDragActive ? "text-primary" : "text-muted-foreground"
            )}
          />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragActive ? (
                <span className="text-primary">Drop files here</span>
              ) : (
                <>
                  <span className="text-primary">Click to upload</span> or drag
                  and drop
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {accept
                ? `Accepted: ${Object.values(accept).flat().join(", ")}`
                : "Any file type"}
            </p>
            <p className="text-xs text-muted-foreground">
              Max {maxFiles} files, up to {formatFileSize(maxSize)} each
            </p>
          </div>
        </div>
      </div>

      {/* File Preview */}
      {showPreview && files.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">
            Selected Files ({files.length})
          </p>
          <ul className="space-y-2">
            {files.map((file) => (
              <li
                key={file.name}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 text-card-foreground"
              >
                {/* File Icon/Preview */}
                <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                  {file.type.startsWith("image/") && file.preview ? (
                    <Image
                      src={file.preview}
                      alt={file.name}
                      width={40}
                      height={40}
                      unoptimized
                      className="h-10 w-10 rounded object-cover"
                      onLoad={() => {
                        if (file.preview) {
                          URL.revokeObjectURL(file.preview)
                        }
                      }}
                    />
                  ) : (
                    <File className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                    {file.status === "uploading" && file.progress !== undefined && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground">
                          {file.progress}%
                        </p>
                      </>
                    )}
                  </div>
                  {file.status === "uploading" && file.progress !== undefined && (
                    <Progress value={file.progress} className="mt-1 h-1" />
                  )}
                  {file.status === "error" && file.error && (
                    <p className="text-xs text-destructive mt-1">{file.error}</p>
                  )}
                </div>

                {/* Status Icon */}
                {file.status === "success" && (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                )}
                {file.status === "error" && (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}

                {/* Remove Button */}
                {!file.status || file.status === "error" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeFile(file.name)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove file</span>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export type { FileWithPreview }
