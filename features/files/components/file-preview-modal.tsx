'use client'

import { useState, useEffect, type ComponentType } from 'react'
import Image from 'next/image'
import type { DocumentProps, PageProps } from 'react-pdf'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { FileItem } from '@/types'
import { formatFileSize, formatDate } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface FilePreviewModalProps {
  file: FileItem | null
  isOpen: boolean
  onClose: () => void
  files?: FileItem[] // For navigation
  onNavigate?: (direction: 'prev' | 'next') => void
}

export function FilePreviewModal({
  file,
  isOpen,
  onClose,
  files,
  onNavigate,
}: FilePreviewModalProps) {
  const [zoom, setZoom] = useState(100)
  const [pdfPage, setPdfPage] = useState(1)
  const [pdfNumPages, setPdfNumPages] = useState(0)

  useEffect(() => {
    // Reset zoom when file changes
    setZoom(100)
    setPdfPage(1)
  }, [file?.id])

  if (!file) return null

  const isImage = file.mimeType?.startsWith('image/')
  const isPdf = file.mimeType === 'application/pdf'
  const isVideo = file.mimeType?.startsWith('video/')
  const isAudio = file.mimeType?.startsWith('audio/')
  const canPreview = isImage || isPdf || isVideo || isAudio

  const currentIndex = files?.findIndex((f) => f.id === file.id) ?? -1
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < (files?.length ?? 0) - 1

  const handleDownload = () => {
    // Trigger download using presigned URL
    const link = document.createElement('a')
    link.href = file.downloadUrl || file.url || ''
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <DialogTitle className="truncate">{file.name}</DialogTitle>
              <Badge variant="outline" className="text-xs">
                {file.mimeType}
              </Badge>
              {file.status === 'scanning' && (
                <Badge variant="secondary" className="text-xs">
                  Scanning...
                </Badge>
              )}
              {file.status === 'infected' && (
                <Badge variant="destructive" className="text-xs">
                  Infected
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom controls for images */}
              {isImage && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setZoom((z) => Math.max(25, z - 25))}
                    disabled={zoom <= 25}
                  >
                    <ZoomOut size={16} />
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
                    {zoom}%
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setZoom((z) => Math.min(200, z + 25))}
                    disabled={zoom >= 200}
                  >
                    <ZoomIn size={16} />
                  </Button>
                </>
              )}

              {/* Download button */}
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download size={14} className="mr-2" />
                Download
              </Button>

              {/* Navigation arrows */}
              {files && files.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onNavigate?.('prev')}
                    disabled={!hasPrev}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onNavigate?.('next')}
                    disabled={!hasNext}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Preview content */}
        <div className="flex flex-col lg:flex-row h-[calc(90vh-120px)]">
          {/* Main preview area */}
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6 overflow-auto">
            {file.status === 'infected' ? (
              <div className="text-center space-y-4">
                <div className="text-red-500">
                  <AlertTriangle size={64} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">File infected</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    This file contains a virus and cannot be previewed or downloaded.
                  </p>
                </div>
              </div>
            ) : !canPreview ? (
              <div className="text-center space-y-4">
                <div className="text-gray-400">
                  <FileIcon size={64} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Preview not available</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    This file type cannot be previewed. Download to view.
                  </p>
                  <Button onClick={handleDownload} className="mt-4">
                    <Download size={14} className="mr-2" />
                    Download to view
                  </Button>
                </div>
              </div>
            ) : isImage ? (
              <div className="relative w-full h-full">
                <Image
                  src={file.url}
                  alt={file.name}
                  fill
                  unoptimized
                  className="object-contain"
                  style={{ transform: `scale(${zoom / 100})` }}
                />
              </div>
            ) : isPdf ? (
              <PDFPreview
                url={file.url}
                page={pdfPage}
                onPageChange={setPdfPage}
                onNumPagesChange={setPdfNumPages}
              />
            ) : isVideo ? (
              <video
                src={file.url}
                controls
                className="max-w-full max-h-full"
              >
                Your browser does not support video playback.
              </video>
            ) : isAudio ? (
              <div className="w-full max-w-md">
                <audio src={file.url} controls className="w-full">
                  Your browser does not support audio playback.
                </audio>
              </div>
            ) : null}
          </div>

          {/* Sidebar with metadata */}
          <div className="w-full lg:w-80 border-l border-gray-200 dark:border-gray-700 p-6 space-y-4 overflow-y-auto">
            <div>
              <h3 className="text-sm font-semibold mb-3">File Details</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-600 dark:text-gray-400">Size</dt>
                  <dd className="font-medium">{formatFileSize(file.size)}</dd>
                </div>
                <div>
                  <dt className="text-gray-600 dark:text-gray-400">Type</dt>
                  <dd className="font-medium">{file.mimeType}</dd>
                </div>
                <div>
                  <dt className="text-gray-600 dark:text-gray-400">Uploaded</dt>
                  <dd className="font-medium">{formatDate(file.createdAt, 'PPP')}</dd>
                </div>
                {file.uploadedBy && (
                  <div>
                    <dt className="text-gray-600 dark:text-gray-400">Uploaded by</dt>
                    <dd className="font-medium">{file.uploadedBy.name}</dd>
                  </div>
                )}
              </dl>
            </div>

            {file.contextType && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Context</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {file.contextType === 'chat' && '💬 Chat'}
                    {file.contextType === 'mail' && '📧 Mail'}
                    {file.contextType === 'project' && '📋 Project'}
                  </Badge>
                  {file.contextId && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs">
                      <ExternalLink size={12} className="mr-1" />
                      View context
                    </Button>
                  )}
                </div>
              </div>
            )}

            {isPdf && pdfNumPages > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">PDF Navigation</h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
                    disabled={pdfPage <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex-1 text-center">
                    {pdfPage} / {pdfNumPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPdfPage((p) => Math.min(pdfNumPages, p + 1))}
                    disabled={pdfPage >= pdfNumPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// PDF Preview component using react-pdf
function PDFPreview({
  url,
  page,
  onPageChange,
  onNumPagesChange,
}: {
  url: string
  page: number
  onPageChange: (page: number) => void
  onNumPagesChange: (numPages: number) => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1.0)

  // Dynamic import for react-pdf to avoid SSR issues
  const [Document, setDocument] = useState<ComponentType<DocumentProps> | null>(null)
  const [Page, setPage] = useState<ComponentType<PageProps> | null>(null)

  useEffect(() => {
    const loadPdfComponents = async () => {
      try {
        const reactPdf = await import('react-pdf')
        try {
          reactPdf.pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
        } catch {
          const ver = reactPdf.pdfjs?.version || '4.0.0'
          reactPdf.pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${ver}/build/pdf.worker.min.mjs`
        }
        setDocument(() => reactPdf.Document as unknown as ComponentType<DocumentProps>)
        setPage(() => reactPdf.Page as unknown as ComponentType<PageProps>)
      } catch (err) {
        console.error('Failed to load PDF components:', err)
        setError('Failed to load PDF viewer')
      }
    }
    loadPdfComponents()
  }, [])

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    onNumPagesChange(numPages)
    setLoading(false)
    setError(null)
  }

  const handleDocumentLoadError = (err: Error) => {
    console.error('Failed to load PDF:', err)
    setError('Failed to load PDF document')
    setLoading(false)
  }

  if (!Document || !Page) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading PDF viewer...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      {/* Zoom controls */}
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
          disabled={scale <= 0.5}
        >
          <ZoomOut size={14} />
        </Button>
        <span className="text-sm font-medium min-w-[60px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setScale((s) => Math.min(3, s + 0.25))}
          disabled={scale >= 3}
        >
          <ZoomIn size={14} />
        </Button>
      </div>

      {/* PDF Document */}
      <div className="overflow-auto max-h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg shadow-inner">
        {error ? (
          <div className="flex items-center justify-center h-96 px-4">
            <div className="text-center space-y-2">
              <AlertTriangle size={48} className="text-red-500 mx-auto" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        ) : (
          <Document
            file={url}
            onLoadSuccess={handleDocumentLoadSuccess}
            onLoadError={handleDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-96">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Loading PDF...</p>
                </div>
              </div>
            }
          >
            <Page
              pageNumber={page}
              scale={scale}
              loading={
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              }
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        )}
      </div>
    </div>
  )
}

function AlertTriangle({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function FileIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  )
}
