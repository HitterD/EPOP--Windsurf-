'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  MessageSquare, 
  FolderKanban, 
  Users, 
  File, 
  Calendar,
  MapPin,
  ExternalLink,
  X 
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

type SearchResultType = 'message' | 'project' | 'user' | 'file'

interface SearchResult {
  id: string
  type: SearchResultType
  item: Record<string, unknown>
  highlights?: Array<{ field: string; matches: string[] }>
}

interface SearchPreviewPaneProps {
  result: SearchResult | null
  onClose: () => void
}

export function SearchPreviewPane({ result, onClose }: SearchPreviewPaneProps) {
  if (!result) {
    return (
      <Card className="flex h-full items-center justify-center border-l">
        <CardContent className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Select a search result to preview
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex h-full flex-col border-l">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          {result.type === 'message' && <MessageSquare className="h-5 w-5" />}
          {result.type === 'project' && <FolderKanban className="h-5 w-5" />}
          {result.type === 'user' && <Users className="h-5 w-5" />}
          {result.type === 'file' && <File className="h-5 w-5" />}
          <CardTitle className="text-lg capitalize">{result.type} Preview</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <Separator />

      {/* Content */}
      <ScrollArea className="flex-1">
        <CardContent className="p-6">
          {result.type === 'message' && (
            <MessagePreview
              item={result.item}
              {...(result.highlights ? { highlights: result.highlights } : {})}
            />
          )}
          {result.type === 'project' && (
            <ProjectPreview
              item={result.item}
              {...(result.highlights ? { highlights: result.highlights } : {})}
            />
          )}
          {result.type === 'user' && (
            <UserPreview
              item={result.item}
              {...(result.highlights ? { highlights: result.highlights } : {})}
            />
          )}
          {result.type === 'file' && (
            <FilePreview
              item={result.item}
              {...(result.highlights ? { highlights: result.highlights } : {})}
            />
          )}
        </CardContent>
      </ScrollArea>

      {/* Footer Actions */}
      <Separator />
      <div className="p-4">
        <Button className="w-full" variant="default">
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in Full View
        </Button>
      </div>
    </Card>
  )
}

// Message Preview
function MessagePreview({ item, highlights }: { item: Record<string, unknown>; highlights?: Array<{ field: string; matches: string[] }> }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Message Content</h3>
        <p className="rounded-lg bg-muted/50 p-4 text-sm">{(item as { content?: string }).content}</p>
      </div>

      {highlights && highlights.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Matching Sections</h3>
          <div className="space-y-2">
            {highlights.map((h, idx) => (
              <div key={idx} className="rounded-md bg-yellow-50 p-3 text-xs dark:bg-yellow-950/20">
                …{h.matches.join(' … ')}…
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Chat</p>
          <p className="font-medium">{(item as { chatId?: string }).chatId ? `Chat ${(item as { chatId?: string }).chatId}` : 'Direct Message'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Sent</p>
          <p className="font-medium">{formatDate((item as { createdAt?: string }).createdAt as string, 'long')}</p>
        </div>
      </div>
    </div>
  )
}

// Project Preview
function ProjectPreview({ item, highlights }: { item: Record<string, unknown>; highlights?: Array<{ field: string; matches: string[] }> }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-2 text-2xl font-bold">{(item as { name?: string }).name}</h2>
        {(item as { description?: string }).description && (
          <p className="text-sm text-muted-foreground">{(item as { description?: string }).description}</p>
        )}
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Team Members</p>
          <p className="text-2xl font-bold">{((item as { memberIds?: unknown[] }).memberIds?.length) || 0}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <Badge variant="default" className="mt-1">
            Active
          </Badge>
        </div>
      </div>

      {(item as { color?: string }).color && (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">Project Color</p>
          <div className="flex items-center gap-2">
            <div 
              className="h-8 w-8 rounded-md border" 
              style={{ backgroundColor: (item as { color?: string }).color }}
            />
            <span className="text-xs font-mono">{(item as { color?: string }).color}</span>
          </div>
        </div>
      )}

      {highlights && highlights.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Matching Content</h3>
          <div className="space-y-2">
            {highlights.map((h, idx) => (
              <div key={idx} className="rounded-md bg-yellow-50 p-3 text-xs dark:bg-yellow-950/20">
                {h.matches.join(' ')}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// User Preview
function UserPreview({ item, highlights }: { item: Record<string, unknown>; highlights?: Array<{ field: string; matches: string[] }> }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
          {((item as { name?: string }).name?.charAt(0)) || 'U'}
        </div>
        <div>
          <h2 className="text-xl font-bold">{(item as { name?: string }).name}</h2>
          <p className="text-sm text-muted-foreground">{(item as { email?: string }).email}</p>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Role</p>
          <Badge variant="secondary" className="mt-1">
            {(item as { role?: string }).role || 'User'}
          </Badge>
        </div>
        <div>
          <p className="text-muted-foreground">Status</p>
          <Badge variant="default" className="mt-1">
            Active
          </Badge>
        </div>
      </div>

      {(item as { department?: string }).department && (
        <div>
          <p className="text-sm text-muted-foreground">Department</p>
          <p className="font-medium">{(item as { department?: string }).department}</p>
        </div>
      )}

      {(item as { location?: string }).location && (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{(item as { location?: string }).location}</span>
        </div>
      )}
    </div>
  )
}

// File Preview
function FilePreview({ item, highlights }: { item: Record<string, unknown>; highlights?: Array<{ field: string; matches: string[] }> }) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = () => {
    const mimeType = (item as { mimeType?: string }).mimeType
    if (mimeType?.startsWith('image/')) return '🖼️'
    if (mimeType?.includes('pdf')) return '📄'
    if (mimeType?.includes('video')) return '🎥'
    return '📎'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-3xl">
          {getFileIcon()}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold">{(item as { name?: string }).name}</h2>
          <p className="text-sm text-muted-foreground">{formatBytes(((item as { size?: number }).size ?? 0) as number)}</p>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Type</p>
          <p className="font-medium">{(item as { mimeType?: string }).mimeType || 'Unknown'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Uploaded</p>
          <p className="font-medium">{formatDate(((item as { createdAt?: string }).createdAt as string), 'relative')}</p>
        </div>
      </div>

      {(item as { context?: { type?: string } }).context && (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">Origin</p>
          <Badge variant="secondary">
            {((item as { context?: { type?: string } }).context?.type) === 'chat' && '💬 Chat'}
            {((item as { context?: { type?: string } }).context?.type) === 'task' && '✓ Task'}
            {((item as { context?: { type?: string } }).context?.type) === 'mail' && '📧 Mail'}
            {((item as { context?: { type?: string } }).context?.type) === 'general' && '📁 General'}
          </Badge>
        </div>
      )}

      {(item as { version?: string | number }).version && (
        <div>
          <p className="text-sm text-muted-foreground">Version</p>
          <p className="font-medium">v{(item as { version?: string | number }).version}</p>
        </div>
      )}

      {/* Thumbnail preview for images */}
      {((item as { mimeType?: string }).mimeType?.startsWith('image/')) && (item as { thumbnailUrl?: string }).thumbnailUrl && (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">Preview</p>
          <div className="relative h-48 w-full">
            <Image 
              src={(item as { thumbnailUrl?: string }).thumbnailUrl as string} 
              alt={(item as { name?: string }).name as string}
              fill
              unoptimized
              className="object-contain rounded-lg border"
            />
          </div>
        </div>
      )}
    </div>
  )
}
