'use client'

import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/format'
import { MessageCircle, Folder, User, File, Calendar, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    name?: string
    email?: string
    department?: string
    uploadedBy?: string
  }
}

interface SearchResultsListProps {
  results: SearchResult[]
  query: string
  onResultClick: (result: SearchResult) => void
}

export function SearchResultsList({ results, query, onResultClick }: SearchResultsListProps) {
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
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

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {results.map((result) => (
        <div
          key={result.id}
          onClick={() => onResultClick(result)}
          className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
        >
          {result.type === 'message' && (
            <MessageResult result={result} query={query} highlightText={highlightText} />
          )}
          {result.type === 'project' && (
            <ProjectResult result={result} query={query} highlightText={highlightText} />
          )}
          {result.type === 'user' && (
            <UserResult result={result} query={query} highlightText={highlightText} />
          )}
          {result.type === 'file' && (
            <FileResult result={result} query={query} highlightText={highlightText} />
          )}
        </div>
      ))}
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
              src={result.metadata.sender.avatar || ''}
              alt={result.metadata.sender.name}
              size="xs"
            />
          )}
          <span className="text-sm font-medium">
            {result.metadata?.sender?.name || 'Unknown'}
          </span>
          <span className="text-xs text-gray-500">in {result.metadata?.chatName}</span>
          <span className="text-xs text-gray-400">
            {result.metadata?.date && formatDate(result.metadata.date, 'relative')}
          </span>
        </div>
        <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
          {highlightText(result.content || result.snippet || '', query)}
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
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {highlightText(result.title, query)}
          </span>
          {result.metadata?.status && (
            <Badge variant="outline" className="text-xs">
              {result.metadata.status}
            </Badge>
          )}
        </div>
        {result.snippet && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {highlightText(result.snippet, query)}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
          {result.metadata?.date && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(result.metadata.date, 'PP')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function UserResult({ result, query, highlightText }: ResultRendererProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0">
        <Avatar
          src={result.metadata?.avatar || ''}
          alt={result.metadata?.name || ''}
          size="sm"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {highlightText(result.title, query)}
          </span>
          {result.metadata?.status && (
            <span className={cn(
              'w-2 h-2 rounded-full',
              result.metadata.status === 'available' && 'bg-green-500',
              result.metadata.status === 'busy' && 'bg-red-500',
              result.metadata.status === 'away' && 'bg-yellow-500'
            )} />
          )}
        </div>
        {result.metadata?.email && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {highlightText(result.metadata.email, query)}
          </p>
        )}
        {result.metadata?.department && (
          <p className="text-xs text-gray-500 mt-1">
            {result.metadata.department}
          </p>
        )}
      </div>
    </div>
  )
}

function FileResult({ result, query, highlightText }: ResultRendererProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-1">
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <File size={16} className="text-gray-500" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {highlightText(result.title, query)}
          </span>
          {result.metadata?.fileSize && (
            <span className="text-xs text-gray-500">
              {(result.metadata.fileSize / 1024).toFixed(1)} KB
            </span>
          )}
        </div>
        {result.snippet && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
            {highlightText(result.snippet, query)}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
          {result.metadata?.date && (
            <span>{formatDate(result.metadata.date, 'PP')}</span>
          )}
          {result.metadata?.uploadedBy && (
            <span>by {result.metadata.uploadedBy}</span>
          )}
        </div>
      </div>
    </div>
  )
}
