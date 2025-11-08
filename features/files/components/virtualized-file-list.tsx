'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { FileIcon, File as FileIconLucide, Image as ImageIcon, Video, Music, Archive } from 'lucide-react'
import { FileItem } from '@/types'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

interface VirtualizedFileListProps {
  files: FileItem[]
  onFileClick: (file: FileItem) => void
  selectedIds?: string[]
  onToggleSelect?: (id: string) => void
  variant?: 'grid' | 'list'
}

export function VirtualizedFileList({
  files,
  onFileClick,
  selectedIds = [],
  onToggleSelect,
  variant = 'list',
}: VirtualizedFileListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (variant === 'grid' ? 200 : 72),
    overscan: 15,
  })

  const items = virtualizer.getVirtualItems()

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <FileIconLucide size={48} className="mx-auto mb-2 opacity-50" />
          <p>No files</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className="h-full overflow-y-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualRow) => {
          const file = files[virtualRow.index]
          if (!file) return null
          const isSelected = selectedIds.includes(file.id)

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {variant === 'list' ? (
                <FileListItem
                  file={file}
                  isSelected={isSelected}
                  onClick={() => onFileClick(file)}
                  {...(onToggleSelect ? { onToggleSelect: () => onToggleSelect(file.id) } : {})}
                />
              ) : (
                <FileGridItem
                  file={file}
                  isSelected={isSelected}
                  onClick={() => onFileClick(file)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FileListItem({
  file,
  isSelected,
  onClick,
  onToggleSelect,
}: {
  file: FileItem
  isSelected: boolean
  onClick: () => void
  onToggleSelect?: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 border-b hover:bg-accent/50 cursor-pointer transition-colors',
        isSelected && 'bg-accent'
      )}
      onClick={onClick}
    >
      <div className="flex-shrink-0">
        {getFileIcon(file.mimeType)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{file.name}</div>
        <div className="text-xs text-muted-foreground">
          {formatFileSize(file.size)} • {formatDate(file.createdAt, 'relative')}
        </div>
      </div>
    </div>
  )
}

function FileGridItem({
  file,
  isSelected,
  onClick,
}: {
  file: FileItem
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <div
      className={cn(
        'p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors',
        isSelected && 'bg-accent'
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-center h-32 mb-2">
        {getFileIcon(file.mimeType, 48)}
      </div>
      <div className="text-sm font-medium truncate">{file.name}</div>
      <div className="text-xs text-muted-foreground">
        {formatFileSize(file.size)}
      </div>
    </div>
  )
}

function getFileIcon(mimeType: string, size = 24) {
  if (mimeType.startsWith('image/')) {
    return <ImageIcon size={size} className="text-blue-500" />
  }
  if (mimeType.startsWith('video/')) {
    return <Video size={size} className="text-purple-500" />
  }
  if (mimeType.startsWith('audio/')) {
    return <Music size={size} className="text-green-500" />
  }
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) {
    return <Archive size={size} className="text-orange-500" />
  }
  return <FileIcon size={size} className="text-gray-500" />
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
