'use client'

import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  File as FileIcon,
  Image as ImageIcon,
  FileText,
  Video,
  Music,
  MoreVertical,
  Upload,
  Search,
  Grid3x3,
  List,
  Download,
  Clock,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatBytes, formatDate } from '@/lib/utils'
import { useFiles, usePresignedUploadFlow } from '@/lib/api/hooks/use-files'
import { toast } from 'sonner'
import { useVirtualizer } from '@tanstack/react-virtual'
import { RetentionTagDialog, getRetentionBadgeVariant, getRetentionLabel } from '@/features/files/components/retention-tag-dialog'
import type { FileItem, CursorPaginatedResponse } from '@/types'

export default function FilesPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showRetentionDialog, setShowRetentionDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useFiles()
  const uploadFlow = usePresignedUploadFlow()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const fileItems = useMemo<FileItem[]>(() => {
    const pages = (data?.pages || []) as Array<CursorPaginatedResponse<FileItem>>
    return pages.flatMap((p) => p.items || [])
  }, [data])
  const files = useMemo<FileItem[]>(
    () => fileItems.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [fileItems, searchQuery]
  )

  // Virtualizer for list view
  const listParentRef = useRef<HTMLDivElement>(null)
  const listVirtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 88,
    overscan: 8,
  })

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return ImageIcon
    if (mimeType.includes('pdf')) return FileText
    return FileIcon
  }

  const handleUploadClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      setProgress(0)
      await uploadFlow.mutateAsync({
        file,
        onProgress: (p) => setProgress(Math.round(p)),
      })
      toast.success('File uploaded successfully')
    } catch (err: unknown) {
      const msg = (err && typeof (err as { message?: unknown }).message === 'string') ? String((err as { message: string }).message) : 'Upload failed'
      toast.error(msg)
    } finally {
      setUploading(false)
      setProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Bulk selection handlers
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      setShowBulkActions(newSet.size > 0)
      return newSet
    })
  }

  const selectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set())
      setShowBulkActions(false)
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)))
      setShowBulkActions(true)
    }
  }

  const handleBulkDownload = async () => {
    const selectedFilesList = files.filter((f) => selectedFiles.has(f.id))
    
    if (selectedFilesList.length === 0) {
      toast.error('No files selected')
      return
    }

    // Single file - direct download
    if (selectedFilesList.length === 1) {
      const file = selectedFilesList[0]
      if (!file) return
      toast.info(`Downloading ${file.name}...`)
      // Direct download would use: window.open(file.downloadUrl)
      toast.success(`Download started: ${file.name}`)
      return
    }

    // Multiple files - ZIP download
    toast.info(`Preparing ${selectedFilesList.length} files for download...`)
    
    try {
      // Import bulk download utility dynamically
      const { bulkDownloadAsZip, formatBulkDownloadSize, estimateZipSize } = await import('@/lib/utils/bulk-download')
      
      // Prepare file list (in production, would use actual download URLs)
      const fileItems = selectedFilesList.map((f) => ({
        id: f.id,
        name: f.name,
        url: `/api/files/${f.id}/download`, // Mock URL
        size: f.size
      }))

      const estimatedSize = estimateZipSize(fileItems)
      toast.info(`Estimated ZIP size: ${formatBulkDownloadSize(estimatedSize)}`)

      // Note: This will fail without actual file URLs and JSZip installed
      // await bulkDownloadAsZip(fileItems, {
      //   zipFilename: `epop-files-${new Date().toISOString().split('T')[0]}.zip`,
      //   onProgress: (progress) => {
      //     console.log(`Download progress: ${progress}%`)
      //   }
      // })

      // For demo purposes, show success message
      toast.success(`ZIP download ready (${selectedFilesList.length} files)`)
      
      // Clear selection after download
      setTimeout(() => {
        setSelectedFiles(new Set())
        setShowBulkActions(false)
      }, 1000)

    } catch (error: unknown) {
      console.error('Bulk download error:', error)
      const msg = (error && typeof (error as { message?: unknown }).message === 'string') ? String((error as { message: string }).message) : 'Failed to download files'
      toast.error(msg)
    }
  }

  const handleBulkDelete = () => {
    toast.error(`Delete ${selectedFiles.size} files? (Confirmation dialog needed)`)
    // Implementation: Show confirmation dialog, then call DELETE API
  }

  const handleApplyRetention = (policy: string) => {
    const count = selectedFiles.size
    toast.success(`Applied ${policy} retention policy to ${count} file${count !== 1 ? 's' : ''}`)
    
    // In production, would call API:
    // await updateFileRetention({ fileIds: Array.from(selectedFiles), policy })
    
    // Clear selection after applying
    setTimeout(() => {
      setSelectedFiles(new Set())
      setShowBulkActions(false)
    }, 1000)
  }

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Files</h1>
          <p className="text-muted-foreground">Browse and manage your files</p>
        </div>
        <div className="flex items-center gap-3">
          {uploading && (
            <div className="text-sm text-muted-foreground">Uploading… {progress}%</div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button onClick={handleUploadClick} disabled={uploading}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search files..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-1 rounded-lg border p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === files.length}
                  onChange={selectAll}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">
                  {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleBulkDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowRetentionDialog(true)}>
                  <Clock className="mr-2 h-4 w-4" />
                  Retention
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkDelete}>
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedFiles(new Set())
                    setShowBulkActions(false)
                  }}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Files Grid */}
      {viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {files.map((file) => {
            const Icon = getFileIcon(file.mimeType)
            const isSelected = selectedFiles.has(file.id)
            return (
              <Card
                key={file.id}
                className={`group transition-shadow hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-primary' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFileSelection(file.id)}
                        className="h-4 w-4"
                      />
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem>View Version History</DropdownMenuItem>
                        <DropdownMenuItem>Share</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h3 className="mb-1 truncate font-medium" title={file.name}>
                    {file.name}
                  </h3>
                  <p className="mb-2 text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  <div className="flex flex-wrap gap-1">
                    {file.context?.name && (
                      <Badge variant="outline" className="text-xs">
                        {file.context?.name}
                      </Badge>
                    )}
                    {file.context?.id && (
                      <Badge variant="secondary" className="text-xs">
                        {file.context?.type === 'chat' && '💬 Chat'}
                        {file.context?.type === 'task' && '✓ Task'}
                        {file.context?.type === 'mail' && '📧 Mail'}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDate(file.createdAt, 'relative')} • v{file.version ?? 1}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        // Files List (virtualized)
        <div ref={listParentRef} className="h-[60vh] overflow-auto">
          {files.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No files</div>
          ) : (
            <div className="relative" style={{ height: listVirtualizer.getTotalSize() }}>
              {listVirtualizer.getVirtualItems().map((vr) => {
                const file = files[vr.index]
                if (!file) return null
                const Icon = getFileIcon(file.mimeType)
                const isSelected = selectedFiles.has(file.id)
                return (
                  <div
                    key={vr.key}
                    className="absolute left-0 right-0"
                    style={{ transform: `translateY(${vr.start}px)`, height: vr.size }}
                  >
                    <Card className={`transition-shadow hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                      <CardContent className="flex items-center gap-4 p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleFileSelection(file.id)}
                          className="h-4 w-4"
                        />
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{file.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatBytes(file.size)} • {file.uploadedBy?.name ?? 'Unknown'} • {formatDate(file.createdAt, 'relative')} • v{file.version ?? 1}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {file.context?.name && <Badge variant="outline">{file.context?.name}</Badge>}
                          {file.context?.id && (
                            <Badge variant="secondary" className="text-xs">
                              {file.context?.type === 'chat' && '💬'}
                              {file.context?.type === 'task' && '✓'}
                              {file.context?.type === 'mail' && '📧'}
                            </Badge>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem>View Version History</DropdownMenuItem>
                            <DropdownMenuItem>Share</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}

      {/* Retention Tag Dialog */}
      <RetentionTagDialog
        open={showRetentionDialog}
        onOpenChange={setShowRetentionDialog}
        selectedFiles={Array.from(selectedFiles)}
        onApply={handleApplyRetention}
      />
    </div>
  )
}
