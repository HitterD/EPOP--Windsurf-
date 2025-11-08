'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FileItem } from '@/types'
import { formatFileSize, formatDate } from '@/lib/utils/format'
import { 
  File, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive,
  MoreVertical,
  Download,
  Eye,
  Trash2,
  Share2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'

interface FileCardProps {
  file: FileItem
  view?: 'grid' | 'list'
  selected?: boolean
  onPreview?: (file: FileItem) => void
  onDownload?: (file: FileItem) => void
  onDelete?: (file: FileItem) => void
  onSelect?: (file: FileItem) => void
}

export function FileCard({
  file,
  view = 'grid',
  selected,
  onPreview,
  onDownload,
  onDelete,
  onSelect,
}: FileCardProps) {
  const [imageError, setImageError] = useState(false)

  const isImage = file.mimeType?.startsWith('image/')
  const isPdf = file.mimeType === 'application/pdf'
  const isVideo = file.mimeType?.startsWith('video/')
  const isAudio = file.mimeType?.startsWith('audio/')
  const isArchive = ['application/zip', 'application/x-rar', 'application/x-7z-compressed'].includes(file.mimeType || '')

  // File icon based on type
  const FileIcon = isPdf
    ? FileText
    : isVideo
    ? Video
    : isAudio
    ? Music
    : isArchive
    ? Archive
    : File

  // Status badge
  const statusBadge = {
    pending: { label: 'Pending', variant: 'secondary' as const },
    scanning: { label: 'Scanning', variant: 'secondary' as const },
    ready: { label: 'Ready', variant: 'default' as const },
    infected: { label: 'Infected', variant: 'destructive' as const },
    failed: { label: 'Failed', variant: 'destructive' as const },
  }[file.status || 'ready']

  if (view === 'list') {
    return (
      <div
        className={cn(
          'flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer',
          selected && 'bg-primary-50 dark:bg-primary-900/20 border-primary-500'
        )}
        onClick={() => onSelect?.(file)}
      >
        {/* Thumbnail/Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {isImage && !imageError ? (
            <Image
              src={file.thumbnailUrl || file.url}
              alt={file.name}
              width={48}
              height={48}
              unoptimized
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <FileIcon size={24} className="text-gray-400" />
          )}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{file.name}</p>
            {file.status !== 'ready' && (
              <Badge variant={statusBadge.variant} className="text-xs">
                {statusBadge.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mt-1">
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span>{formatDate(file.createdAt, 'PP')}</span>
            {file.uploadedBy && (
              <>
                <span>•</span>
                <span>{file.uploadedBy.name}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation()
              onPreview?.(file)
            }}
          >
            <Eye size={16} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation()
              onDownload?.(file)
            }}
          >
            <Download size={16} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPreview?.(file)}>
                <Eye size={14} className="mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload?.(file)}>
                <Download size={14} className="mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 size={14} className="mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete?.(file)} className="text-error">
                <Trash2 size={14} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div
      className={cn(
        'group relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all cursor-pointer',
        selected && 'ring-2 ring-primary-500 border-primary-500'
      )}
      onClick={() => onSelect?.(file)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
        {isImage && !imageError ? (
          <Image
            src={file.thumbnailUrl || file.url}
            alt={file.name}
            fill
            unoptimized
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <FileIcon size={48} className="text-gray-400" />
        )}

        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="h-10 w-10"
            onClick={(e) => {
              e.stopPropagation()
              onPreview?.(file)
            }}
          >
            <Eye size={18} />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-10 w-10"
            onClick={(e) => {
              e.stopPropagation()
              onDownload?.(file)
            }}
          >
            <Download size={18} />
          </Button>
        </div>

        {/* Status badge */}
        {file.status !== 'ready' && (
          <div className="absolute top-2 right-2">
            <Badge variant={statusBadge.variant} className="text-xs">
              {statusBadge.label}
            </Badge>
          </div>
        )}
      </div>

      {/* File info */}
      <div className="p-3 bg-white dark:bg-gray-800">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" title={file.name}>
              {file.name}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {formatFileSize(file.size)}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0">
                <MoreVertical size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPreview?.(file)}>
                <Eye size={14} className="mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload?.(file)}>
                <Download size={14} className="mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 size={14} className="mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete?.(file)} className="text-error">
                <Trash2 size={14} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Uploader */}
        {file.uploadedBy && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Avatar
              {...(file.uploadedBy.avatar ? { src: file.uploadedBy.avatar } : {})}
              alt={file.uploadedBy.name}
              size="xs"
              fallback={file.uploadedBy.name?.[0] ?? 'U'}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {file.uploadedBy.name}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
