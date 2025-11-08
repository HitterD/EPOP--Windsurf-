'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Attachment, type FileItem } from '@/types'
import { File, Download, Eye, Image as ImageIcon, FileText, Video, Music } from 'lucide-react'
import { formatFileSize } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FilePreviewModal } from '@/features/files/components/file-preview-modal'

interface MessageAttachmentsProps {
  attachments: Attachment[]
  compact?: boolean
}

export function MessageAttachments({ attachments, compact = false }: MessageAttachmentsProps) {
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)

  if (!attachments || attachments.length === 0) return null

  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement('a')
    link.href = attachment.url
    link.download = attachment.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePreview = (attachment: Attachment) => {
    setPreviewFile({
      id: attachment.id,
      name: attachment.name,
      size: attachment.size,
      mimeType: attachment.mimeType,
      url: attachment.url,
      status: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as FileItem)
  }

  const canPreview = (mimeType: string) => {
    return (
      mimeType.startsWith('image/') ||
      mimeType === 'application/pdf' ||
      mimeType.startsWith('video/') ||
      mimeType.startsWith('audio/')
    )
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return ImageIcon
    if (mimeType === 'application/pdf') return FileText
    if (mimeType.startsWith('video/')) return Video
    if (mimeType.startsWith('audio/')) return Music
    return File
  }

  // Image attachments - show as thumbnails
  const imageAttachments = attachments.filter((a) => a.mimeType.startsWith('image/'))
  const otherAttachments = attachments.filter((a) => !a.mimeType.startsWith('image/'))

  return (
    <div className="space-y-2 mt-2">
      {/* Image grid */}
      {imageAttachments.length > 0 && (
        <div className={cn(
          'grid gap-2',
          imageAttachments.length === 1 && 'grid-cols-1',
          imageAttachments.length === 2 && 'grid-cols-2',
          imageAttachments.length >= 3 && 'grid-cols-2'
        )}>
          {imageAttachments.slice(0, 4).map((attachment, index) => (
            <div
              key={attachment.id}
              className={cn(
                'relative rounded-lg overflow-hidden cursor-pointer group',
                imageAttachments.length === 1 && 'max-w-md',
                index === 3 && imageAttachments.length > 4 && 'relative'
              )}
              onClick={() => handlePreview(attachment)}
            >
              <div className="relative h-48 w-full">
                <Image
                  src={attachment.url}
                  alt={attachment.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="icon" variant="secondary" className="h-8 w-8">
                  <Eye size={16} />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(attachment)
                  }}
                >
                  <Download size={16} />
                </Button>
              </div>

              {/* More images indicator */}
              {index === 3 && imageAttachments.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-lg font-semibold">
                  +{imageAttachments.length - 4} more
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Other file attachments */}
      {otherAttachments.length > 0 && (
        <div className="space-y-1">
          {otherAttachments.map((attachment) => {
            const FileIconComponent = getFileIcon(attachment.mimeType)
            const previewable = canPreview(attachment.mimeType)

            return (
              <div
                key={attachment.id}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                  compact ? 'text-xs' : 'text-sm'
                )}
              >
                {/* File icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <FileIconComponent size={20} className="text-gray-500" />
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{attachment.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatFileSize(attachment.size)}</span>
                    <span>•</span>
                    <span>{(attachment.mimeType.split('/')[1] ?? attachment.mimeType).toUpperCase()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  {previewable && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handlePreview(attachment)}
                    >
                      <Eye size={14} />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleDownload(attachment)}
                  >
                    <Download size={14} />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          files={attachments.map(a => ({
            id: a.id,
            name: a.name,
            size: a.size,
            mimeType: a.mimeType,
            url: a.url,
            status: 'ready' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))}
          onNavigate={(direction) => {
            const currentIndex = attachments.findIndex(a => a.id === (previewFile as FileItem).id)
            const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1
            if (newIndex >= 0 && newIndex < attachments.length) {
              const newAttachment = attachments[newIndex]
              if (!newAttachment) return
              setPreviewFile({
                id: newAttachment.id,
                name: newAttachment.name,
                size: newAttachment.size,
                mimeType: newAttachment.mimeType,
                url: newAttachment.url,
                status: 'ready',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              } as FileItem)
            }
          }}
        />
      )}
    </div>
  )
}
