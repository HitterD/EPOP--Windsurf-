'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/format'
import { MessageCircle, Folder, User, File, Search } from 'lucide-react'

interface SearchResult {
  id: string
  type: 'message' | 'project' | 'user' | 'file'
  title: string
  content?: string
  snippet?: string
  metadata?: {
    chatName?: string
    sender?: { name: string; avatar?: string }
    projectName?: string
    fileName?: string
    fileSize?: number
    date?: string
    status?: string
    avatar?: string
  }
}

interface VirtualizedSearchResultsProps {
  results: SearchResult[]
  query: string
  onResultClick: (result: SearchResult) => void
}

export function VirtualizedSearchResults({
  results,
  query,
  onResultClick,
}: VirtualizedSearchResultsProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 10,
    // Do not pass undefined for measureElement under exactOptionalPropertyTypes
    ...(typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
      ? {
          measureElement: (
            element: Element,
            _entry?: ResizeObserverEntry,
            _instance?: import('@tanstack/react-virtual').Virtualizer<HTMLDivElement, Element>,
          ) => (element as HTMLElement).getBoundingClientRect().height,
        }
      : {}),
  })

  const items = virtualizer.getVirtualItems()

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query) return text

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 text-inherit">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Search size={48} className="mx-auto mb-2 opacity-50" />
          <p>No results found</p>
          <p className="text-sm mt-1">Try different keywords</p>
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
          const result = results[virtualRow.index]!

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
              <div
                onClick={() => onResultClick(result)}
                className="px-4 py-3 border-b hover:bg-accent/50 cursor-pointer transition-colors"
              >
                {result && result.type === 'message' && (
                  <MessageResult result={result} query={query} highlightText={highlightText} />
                )}
                {result && result.type === 'project' && (
                  <ProjectResult result={result} query={query} highlightText={highlightText} />
                )}
                {result && result.type === 'user' && (
                  <UserResult result={result} query={query} highlightText={highlightText} />
                )}
                {result && result.type === 'file' && (
                  <FileResult result={result} query={query} highlightText={highlightText} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type HighlightFn = (text: string, query: string) => React.ReactNode
type ResultRendererProps = { result: SearchResult; query: string; highlightText: HighlightFn }

function MessageResult({ result, query, highlightText }: ResultRendererProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-1">
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
          <MessageCircle size={16} className="text-blue-500" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {result.metadata?.sender && (
            <Avatar
              src={result.metadata.sender.avatar ?? ''}
              alt={result.metadata.sender.name}
              size="sm"
            />
          )}
          <span className="text-sm font-medium">
            {result.metadata?.sender?.name || 'Unknown'}
          </span>
          <span className="text-xs text-muted-foreground">in {result.metadata?.chatName}</span>
          <span className="text-xs text-muted-foreground">
            {result.metadata?.date && formatDate(result.metadata.date, 'relative')}
          </span>
        </div>
        <p className="text-sm line-clamp-2">
          {highlightText(result.snippet || result.content || '', query)}
        </p>
      </div>
    </div>
  )
}

function ProjectResult({ result, query, highlightText }: ResultRendererProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-1">
        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
          <Folder size={16} className="text-purple-500" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium mb-1">{highlightText(result.title, query)}</div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {highlightText(result.snippet || result.content || '', query)}
        </p>
        {result.metadata?.status && (
          <Badge variant="secondary" className="mt-1">
            {result.metadata.status}
          </Badge>
        )}
      </div>
    </div>
  )
}

function UserResult({ result, query, highlightText }: ResultRendererProps) {
  return (
    <div className="flex items-center gap-3">
      <Avatar
        src={result.metadata?.avatar ?? ''}
        alt={result.title}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium">{highlightText(result.title, query)}</div>
        <p className="text-sm text-muted-foreground truncate">
          {highlightText(result.snippet || '', query)}
        </p>
      </div>
    </div>
  )
}

function FileResult({ result, query, highlightText }: ResultRendererProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-1">
        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
          <File size={16} className="text-green-500" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium mb-1">{highlightText(result.title, query)}</div>
        <div className="text-xs text-muted-foreground">
          {result.metadata?.fileSize && formatFileSize(result.metadata.fileSize)}
          {result.metadata?.date && ` • ${formatDate(result.metadata.date, 'relative')}`}
        </div>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
