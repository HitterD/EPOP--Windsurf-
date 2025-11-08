'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { useSearch } from '@/lib/api/hooks/use-search'
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SearchResultsList } from './search-results-list'
import { SearchFilters } from './search-filters'
import { Search, Loader2, Command } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { SearchResult as ApiSearchResult } from '@/types'

interface GlobalSearchDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function GlobalSearchDialog({ isOpen, onClose }: GlobalSearchDialogProps) {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'messages' | 'projects' | 'users' | 'files'>('all')
  const [filters, setFilters] = useState<Partial<{
    dateFrom: string
    dateTo: string
    fileType: string
    userId: string
  }>>({})

  const debouncedQuery = useDebounce(query, 300)
  const router = useRouter()

  // Fetch search results
  type UISearchResult = {
    id: string
    type: 'message' | 'project' | 'user' | 'file'
    title: string
    content?: string
    snippet?: string
    chatId?: string
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
  const [searchResults, setSearchResults] = useState<UISearchResult[]>([])
  const {
    data: searchData,
    isLoading,
    error,
  } = useSearch({
    query: debouncedQuery,
    tab: activeTab,
    ...(filters && Object.keys(filters).length
      ? {
          filters: {
            ...(filters.dateFrom && filters.dateTo
              ? { dateRange: { from: filters.dateFrom, to: filters.dateTo } }
              : {}),
            ...(filters.userId ? { senderId: filters.userId } : {}),
            ...(filters.fileType ? { fileType: filters.fileType } : {}),
          },
        }
      : {}),
  })

  useEffect(() => {
    if (!searchData) {
      setSearchResults([])
      return
    }
    const data = searchData as ApiSearchResult
    const arr: UISearchResult[] = []
    // Messages
    data.messages?.forEach(({ item }) => {
      arr.push({
        id: item.id,
        type: 'message',
        title: item.content || 'Message',
        content: item.content,
        ...(item.content ? { snippet: item.content } : {}),
        ...(item.chatId ? { chatId: item.chatId } : {}),
        metadata: {
          ...(item.sender
            ? {
                sender: {
                  name: item.sender.name,
                  ...(item.sender.avatar ? { avatar: item.sender.avatar } : {}),
                },
              }
            : {}),
          date: item.createdAt,
        },
      })
    })
    // Projects
    data.projects?.forEach(({ item }) => {
      arr.push({
        id: item.id,
        type: 'project',
        title: item.name,
        ...(item.description ? { snippet: item.description } : {}),
        metadata: {
          date: item.updatedAt,
        },
      })
    })
    // Users
    data.users?.forEach(({ item }) => {
      arr.push({
        id: item.id,
        type: 'user',
        title: item.name,
        snippet: item.email,
        metadata: {
          ...(item.avatar ? { avatar: item.avatar } : {}),
          name: item.name,
          email: item.email,
          ...(item.department ? { department: item.department } : {}),
          status: item.presence,
        },
      })
    })
    // Files
    data.files?.forEach(({ item }) => {
      arr.push({
        id: item.id,
        type: 'file',
        title: item.name,
        snippet: item.mimeType,
        metadata: {
          fileName: item.name,
          fileSize: item.size,
          date: item.createdAt,
          ...(item.uploadedBy?.name ? { uploadedBy: item.uploadedBy.name } : {}),
        },
      })
    })
    setSearchResults(arr)
  }, [searchData])

  const searchResultsArray = searchResults

  const handleResultClick = useCallback((result: UISearchResult) => {
    // Navigate to result
    const routes = {
      message: `/chat/${result.chatId ?? ''}?messageId=${result.id}`,
      project: `/projects/${result.id}`,
      user: `/directory/users/${result.id}`,
      file: `/files?fileId=${result.id}`,
    }

    const route = routes[result.type as keyof typeof routes]
    if (route) {
      router.push(route)
      onClose()
    }
  }, [router, onClose])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (!isOpen) {
          // Open handled by parent
        }
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }

      // Arrow navigation
      if (isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault()
        // Navigate through results
      }

      // Enter to select first result
      if (isOpen && e.key === 'Enter' && searchResultsArray?.length > 0) {
        const firstResult = searchResultsArray[0]
        if (firstResult) handleResultClick(firstResult)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, searchResultsArray, onClose, handleResultClick])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setActiveTab('all')
      setFilters({})
    }
  }, [isOpen])

  

  // Group results by type
  const groupedResults = searchResultsArray.reduce((acc, result) => {
    const type = result.type || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(result)
    return acc
  }, {} as Record<UISearchResult['type'] | string, UISearchResult[]>)

  const resultCounts = {
    all: searchResultsArray?.length || 0,
    messages: groupedResults.message?.length || 0,
    projects: groupedResults.project?.length || 0,
    users: groupedResults.user?.length || 0,
    files: groupedResults.file?.length || 0,
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] p-0 gap-0">
        {/* Search header */}
        <DialogHeader className="px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            <Search size={20} className="text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages, projects, users, files..."
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
              autoFocus
            />
            {isLoading && <Loader2 size={16} className="animate-spin text-gray-400" />}
            <div className="flex items-center gap-1 text-xs text-gray-500 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
              <Command size={12} />
              <span>K</span>
            </div>
          </div>
        </DialogHeader>

        {/* Search filters */}
        <div className="px-4 py-2 border-b bg-gray-50 dark:bg-gray-900">
          <SearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            resultType={activeTab}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'messages' | 'projects' | 'users' | 'files')} className="flex-1 flex flex-col">
          <TabsList className="px-4 pt-2 justify-start rounded-none border-b bg-transparent">
            <TabsTrigger value="all" className="relative">
              All
              {resultCounts.all > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">
                  {resultCounts.all}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages">
              Messages
              {resultCounts.messages > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">
                  {resultCounts.messages}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="projects">
              Projects
              {resultCounts.projects > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">
                  {resultCounts.projects}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users">
              Users
              {resultCounts.users > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">
                  {resultCounts.users}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="files">
              Files
              {resultCounts.files > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">
                  {resultCounts.files}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {query.length < 2 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Search size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Search everything</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Type at least 2 characters to start searching
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 text-left">
                  <div className="text-xs space-y-1">
                    <p className="font-medium">Quick filters:</p>
                    <p className="text-gray-600 dark:text-gray-400">type:message</p>
                    <p className="text-gray-600 dark:text-gray-400">type:project</p>
                    <p className="text-gray-600 dark:text-gray-400">from:username</p>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-medium">Shortcuts:</p>
                    <p className="text-gray-600 dark:text-gray-400">⌘K - Open search</p>
                    <p className="text-gray-600 dark:text-gray-400">↑↓ - Navigate</p>
                    <p className="text-gray-600 dark:text-gray-400">↵ - Open result</p>
                  </div>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={32} className="animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <p className="text-sm text-red-500">Failed to search. Please try again.</p>
              </div>
            ) : !searchResultsArray?.length ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Search size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Try different keywords or adjust filters
                </p>
              </div>
            ) : (
              <>
                <TabsContent value="all" className="mt-0">
                  <SearchResultsList
                    results={searchResultsArray}
                    query={debouncedQuery}
                    onResultClick={handleResultClick}
                  />
                </TabsContent>
                <TabsContent value="messages" className="mt-0">
                  <SearchResultsList
                    results={groupedResults.message || []}
                    query={debouncedQuery}
                    onResultClick={handleResultClick}
                  />
                </TabsContent>
                <TabsContent value="projects" className="mt-0">
                  <SearchResultsList
                    results={groupedResults.project || []}
                    query={debouncedQuery}
                    onResultClick={handleResultClick}
                  />
                </TabsContent>
                <TabsContent value="users" className="mt-0">
                  <SearchResultsList
                    results={groupedResults.user || []}
                    query={debouncedQuery}
                    onResultClick={handleResultClick}
                  />
                </TabsContent>
                <TabsContent value="files" className="mt-0">
                  <SearchResultsList
                    results={groupedResults.file || []}
                    query={debouncedQuery}
                    onResultClick={handleResultClick}
                  />
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>

        {/* Footer with tips */}
        <div className="px-4 py-2 border-t bg-gray-50 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center justify-between">
            <span>Use ↑↓ to navigate, ↵ to select, ESC to close</span>
            <span>{resultCounts.all} results</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
