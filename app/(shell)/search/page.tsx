'use client'

import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Search, MessageSquare, FolderKanban, Users, File, Loader2, Layout } from 'lucide-react'
import {
  useSearch as useSearchAll,
  useSearchMessages,
  useSearchProjects,
  useSearchUsers,
  useSearchFiles,
} from '@/lib/api/hooks/use-search'
import { SearchPreviewPane } from '@/features/search/components/search-preview-pane'
import type { SearchResultItem, SearchHighlight, Message, Project, User, FileItem } from '@/types'

// Highlight matches in text
function highlightText(text: string, query: string) {
  if (!query || !text) return text
  
  const regex = new RegExp(`(${query})`, 'gi')
  const parts = text.split(regex)
  
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState<'all' | 'messages' | 'projects' | 'users' | 'files'>('all')
  const [hasAttachments, setHasAttachments] = useState<boolean | undefined>(undefined)
  const [sender, setSender] = useState('')
  // cursor-based pagination not supported by current SearchResult type
  const [showPreview, setShowPreview] = useState(true)
  type UIPreviewResult = {
    id: string
    type: 'message' | 'project' | 'user' | 'file'
    item: Record<string, unknown>
    highlights?: SearchHighlight[]
  } | null
  const [selectedResult, setSelectedResult] = useState<UIPreviewResult>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Update URL when query changes
  useEffect(() => {
    if (debouncedQuery) {
      router.push(`/search?q=${encodeURIComponent(debouncedQuery)}`, { scroll: false })
    }
  }, [debouncedQuery, router])

  const filters = useMemo(
    () => ({
      ...(sender ? { sender } : {}),
      ...(hasAttachments !== undefined ? { hasAttachments } : {}),
    }),
    [sender, hasAttachments]
  )

  const all = useSearchAll({ query: debouncedQuery, tab: 'all', filters })
  const messages = useSearchMessages(debouncedQuery, filters)
  const projects = useSearchProjects(debouncedQuery, filters)
  const users = useSearchUsers(debouncedQuery, filters)
  const files = useSearchFiles(debouncedQuery, filters)

  const isSearching = all.isLoading || messages.isLoading || projects.isLoading || users.isLoading || files.isLoading

  const handleResultClick = <T,>(result: SearchResultItem<T>, type: 'message' | 'project' | 'user' | 'file') => {
    setSelectedResult({
      id: (result.item as unknown as { id: string }).id,
      type,
      item: result.item as unknown as Record<string, unknown>,
      ...(result.highlights ? { highlights: result.highlights as SearchHighlight[] } : {}),
    })
    if (!showPreview) setShowPreview(true)
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Global Search</h1>
          <div className="flex items-center gap-2">
            {isSearching && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            <Button
              variant={showPreview ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Layout className="mr-2 h-4 w-4" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search across messages, projects, users, and files..."
            className="pl-10 text-lg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        {debouncedQuery && (
          <p className="mt-2 text-sm text-muted-foreground">
            Showing results for: <strong>{debouncedQuery}</strong>
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <Input
          placeholder="Filter by sender (email or name)"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
          className="max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={!!hasAttachments}
            onChange={(e) => setHasAttachments(e.target.checked ? true : undefined)}
          />
          Has attachments
        </label>
      </div>

      {/* Split Layout: Results | Preview */}
      <div className="grid flex-1 gap-4" style={{ gridTemplateColumns: showPreview ? '1fr 400px' : '1fr' }}>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'messages' | 'projects' | 'users' | 'files')} className="flex-1">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="mr-2 h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="projects">
            <FolderKanban className="mr-2 h-4 w-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="files">
            <File className="mr-2 h-4 w-4" />
            Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {query ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Results for "{query}"</p>
              <p>Messages: {all.data?.messages.length ?? 0}</p>
              <p>Projects: {all.data?.projects.length ?? 0}</p>
              <p>Users: {all.data?.users.length ?? 0}</p>
              <p>Files: {all.data?.files.length ?? 0}</p>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              Enter a search query to see results
            </div>
          )}
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          <div className="space-y-2">
            {(messages.data?.messages || []).length === 0 && debouncedQuery && !messages.isLoading && (
              <div className="py-12 text-center text-muted-foreground">
                No messages found for "{debouncedQuery}"
              </div>
            )}
            {(messages.data?.messages || []).map((r) => (
              <Card 
                key={r.item.id} 
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  selectedResult?.item.id === r.item.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleResultClick(r, 'message')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm">{highlightText(r.item.content, debouncedQuery)}</p>
                      {Array.isArray(r.highlights) && r.highlights.length > 0 && (
                        <div className="mt-2 space-y-1 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                          {r.highlights.map((h: SearchHighlight, idx: number) => (
                            <div key={idx}>…{h.matches.join(' … ')}…</div>
                          ))}
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(r.item.createdAt).toLocaleString()}</span>
                        <Badge variant="outline" className="text-xs">
                          {r.item.chatId ? 'Chat' : 'Direct'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Pagination removed: not supported by current SearchResult type */}
          </div>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <div className="space-y-2">
            {(projects.data?.projects || []).length === 0 && debouncedQuery && !projects.isLoading && (
              <div className="py-12 text-center text-muted-foreground">
                No projects found for "{debouncedQuery}"
              </div>
            )}
            {(projects.data?.projects || []).map((r) => (
              <Card 
                key={r.item.id} 
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  selectedResult?.item.id === r.item.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleResultClick(r, 'project')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FolderKanban className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{highlightText(r.item.name, debouncedQuery)}</p>
                        {r.item.description && (
                          <p className="text-xs text-muted-foreground">
                            {highlightText(r.item.description, debouncedQuery)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline">{r.item.memberIds.length} members</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <div className="space-y-2">
            {(users.data?.users || []).length === 0 && debouncedQuery && !users.isLoading && (
              <div className="py-12 text-center text-muted-foreground">
                No users found for "{debouncedQuery}"
              </div>
            )}
            {(users.data?.users || []).map((r) => (
              <Card 
                key={r.item.id} 
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  selectedResult?.item.id === r.item.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleResultClick(r, 'user')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{highlightText(r.item.name, debouncedQuery)}</p>
                      <p className="text-sm text-muted-foreground">
                        {highlightText(r.item.email, debouncedQuery)}
                      </p>
                    </div>
                    <Badge variant="outline">{r.item.role || 'User'}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <div className="space-y-2">
            {(files.data?.files || []).length === 0 && debouncedQuery && !files.isLoading && (
              <div className="py-12 text-center text-muted-foreground">
                No files found for "{debouncedQuery}"
              </div>
            )}
            {(files.data?.files || []).map((r) => (
              <Card 
                key={r.item.id} 
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  selectedResult?.item.id === r.item.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleResultClick(r, 'file')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <File className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{highlightText(r.item.name, debouncedQuery)}</p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded {new Date(r.item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{(r.item.size / 1024).toFixed(1)} KB</Badge>
                      {r.item.context && (
                        <Badge variant="secondary" className="text-xs">
                          {r.item.context.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        </Tabs>

        {/* Preview Pane */}
        {showPreview && (
          <div className="h-full">
            <SearchPreviewPane
              result={selectedResult}
              onClose={() => setSelectedResult(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
