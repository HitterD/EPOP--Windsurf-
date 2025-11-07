# UI States & Feedback Guide

**Wave-2: FE-ux-states & FE-ux-optimistic**  
**Status:** ✅ Implemented  
**Last Updated:** 2025-11-07

---

## Overview

Standardized UI feedback components for consistent Empty, Loading, and Error states across all features, plus optimistic UI update utilities to prevent flickering and duplicates.

---

## Empty States

### Basic Usage

```tsx
import { EmptyState } from '@/components/ui/empty-state'
import { Inbox } from 'lucide-react'

<EmptyState
  icon={Inbox}
  title="No messages yet"
  description="Start a conversation to see messages here"
  action={{
    label: 'New message',
    onClick: handleNewMessage,
  }}
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `icon` | `LucideIcon` | Icon to display |
| `title` | `string` | Title text (required) |
| `description` | `string` | Description text |
| `action` | `object` | Primary action button |
| `secondaryAction` | `object` | Secondary action button |
| `size` | `'sm' \| 'md' \| 'lg'` | Size variant |

### Presets

```tsx
import { 
  NoSearchResults, 
  NoDataYet, 
  NoAccess,
  NotFound 
} from '@/components/ui/empty-state'

// Search results
<NoSearchResults onClear={() => resetFilters()} />

// First-time user
<NoDataYet 
  entityName="Projects" 
  onCreate={handleCreate}
  createLabel="Create project"
/>

// Permission denied
<NoAccess />

// 404
<NotFound onGoBack={() => router.back()} />
```

---

## Loading States

### Loading State Component

```tsx
import { LoadingState } from '@/components/ui/loading-state'

// Basic
<LoadingState message="Loading messages..." />

// Sizes
<LoadingState message="Loading..." size="sm" />
<LoadingState message="Loading..." size="lg" />

// Full screen overlay
<LoadingState message="Processing..." fullScreen />
```

### Skeleton Loaders

```tsx
import { 
  Skeleton,
  ListItemSkeleton,
  CardSkeleton,
  TableSkeleton 
} from '@/components/ui/loading-state'

// Custom skeleton
<Skeleton width={200} height={20} rounded="md" />

// List skeleton
<ListItemSkeleton count={5} />

// Card grid skeleton
<CardSkeleton count={6} />

// Table skeleton
<TableSkeleton rows={10} columns={5} />
```

### Inline Loading

```tsx
import { InlineLoading, LoadingSpinner } from '@/components/ui/loading-state'

// Inline indicator
<InlineLoading message="Sending..." />

// Standalone spinner
<LoadingSpinner size="md" />
```

---

## Error States

### Error State Component

```tsx
import { ErrorState } from '@/components/ui/error-state'

// Basic error
<ErrorState
  title="Failed to load"
  description="Something went wrong"
  onRetry={handleRetry}
/>

// With error code
<ErrorState
  type="server"
  code={500}
  title="Server error"
  description="Please try again later"
  onRetry={handleRetry}
  onGoBack={() => router.back()}
/>

// Inline variant (alert)
<ErrorState
  title="Validation failed"
  description="Please check your input"
  inline
/>
```

### Error Types

| Type | Icon | Use Case |
|------|------|----------|
| `error` | XCircle | Generic errors |
| `warning` | AlertTriangle | Warnings, validation |
| `network` | WifiOff | Connection issues |
| `server` | ServerCrash | Server errors |
| `notFound` | AlertCircle | 404 errors |

### Presets

```tsx
import {
  NetworkError,
  ServerError,
  NotFoundError,
  ValidationError,
  PermissionError,
} from '@/components/ui/error-state'

// Network offline
<NetworkError onRetry={refetch} />

// Server error
<ServerError onRetry={refetch} code={500} />

// 404
<NotFoundError onGoBack={() => router.back()} />

// Validation
<ValidationError 
  message="Email is required"
  onDismiss={closeAlert}
/>

// Permission
<PermissionError />
```

### Error Boundary Fallback

```tsx
import { ErrorBoundaryFallback } from '@/components/ui/error-state'

<ErrorBoundary
  fallback={(error, resetError) => (
    <ErrorBoundaryFallback error={error} resetError={resetError} />
  )}
>
  <MyComponent />
</ErrorBoundary>
```

---

## Optimistic UI Updates

### Basic Hook Usage

```tsx
import { useOptimisticUpdate } from '@/lib/hooks/use-optimistic-update'

function MessageList({ chatId }: { chatId: string }) {
  const { data: serverMessages } = useQuery(['messages', chatId], fetchMessages)
  
  const { 
    items, 
    addOptimistic, 
    confirmOptimistic, 
    failOptimistic,
    isPending 
  } = useOptimisticUpdate({
    initialItems: serverMessages ?? [],
  })

  const sendMessage = async (content: string) => {
    // Create optimistic message
    const tempMessage = {
      id: '',
      content,
      userId: currentUser.id,
      createdAt: new Date(),
    }
    
    // Add optimistically
    const tempId = await addOptimistic(tempMessage)
    
    try {
      // Send to server
      const serverMessage = await api.sendMessage(chatId, content)
      
      // Confirm with server data
      confirmOptimistic(tempId, serverMessage)
      
      toast.success('Message sent')
    } catch (error) {
      // Mark as failed
      failOptimistic(tempId, error)
      
      toast.error('Failed to send message')
    }
  }

  return (
    <div>
      {items.map((item) => (
        <MessageItem
          key={item.tempId}
          message={item.data}
          isPending={item.isPending}
          error={item.error}
        />
      ))}
      {isPending && <InlineLoading message="Sending..." />}
    </div>
  )
}
```

### Optimistic List Hook

```tsx
import { useOptimisticList } from '@/lib/hooks/use-optimistic-update'

function TodoList() {
  const { data: serverTodos } = useQuery(['todos'], fetchTodos)
  
  const { items, addItem, updateItem, deleteItem } = useOptimisticList({
    items: serverTodos ?? [],
  })

  const handleAdd = async (text: string) => {
    await addItem(
      { id: '', text, completed: false },
      (item) => api.createTodo(item)
    )
  }

  const handleToggle = async (id: string) => {
    await updateItem(
      id,
      { completed: !items.find(i => i.id === id)?.completed },
      (id, updates) => api.updateTodo(id, updates)
    )
  }

  const handleDelete = async (id: string) => {
    await deleteItem(id, (id) => api.deleteTodo(id))
  }

  return (
    <ul>
      {items.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={() => handleToggle(todo.id)}
          onDelete={() => handleDelete(todo.id)}
        />
      ))}
    </ul>
  )
}
```

### Optimistic Action Hook

Simple hook for one-time actions:

```tsx
import { useOptimisticAction } from '@/lib/hooks/use-optimistic-update'

function CreatePostForm() {
  const { execute, isPending, error } = useOptimisticAction({
    action: async (content: string) => api.createPost({ content }),
    onSuccess: (post) => {
      toast.success('Post created')
      router.push(`/posts/${post.id}`)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await execute(formData.content)
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea {...register('content')} />
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create post'}
      </Button>
      {error && <ErrorState title="Failed" description={error.message} inline />}
    </form>
  )
}
```

---

## Patterns

### Feature Component Pattern

Standard pattern for all feature components:

```tsx
import { useQuery } from '@tanstack/react-query'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui'

function MyFeature() {
  const { data, isLoading, error, refetch } = useQuery(['my-data'], fetchData)

  // Loading state
  if (isLoading) {
    return <LoadingState message="Loading data..." />
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Failed to load"
        description={error.message}
        onRetry={refetch}
      />
    )
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No data yet"
        description="Create your first item to get started"
        action={{
          label: 'Create item',
          onClick: handleCreate,
        }}
      />
    )
  }

  // Data state
  return (
    <div>
      {data.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
```

### Optimistic Upload Pattern

For file uploads with progress:

```tsx
function FileUploader() {
  const [uploads, setUploads] = useState<OptimisticItem<File>[]>([])

  const uploadFile = async (file: File) => {
    const tempId = nanoid()
    const optimisticFile = createOptimisticItem({
      ...file,
      progress: 0,
    })

    setUploads((prev) => [...prev, optimisticFile])

    try {
      const uploaded = await api.uploadFile(file, (progress) => {
        // Update progress
        setUploads((prev) =>
          prev.map((u) =>
            u.tempId === tempId
              ? { ...u, data: { ...u.data, progress } }
              : u
          )
        )
      })

      // Confirm upload
      setUploads((prev) =>
        reconcileOptimisticItems(prev, uploaded, tempId)
      )
    } catch (error) {
      // Mark failed
      setUploads((prev) =>
        markOptimisticItemFailed(prev, tempId, error)
      )
    }
  }

  return (
    <div>
      {uploads.map((upload) => (
        <UploadItem
          key={upload.tempId}
          file={upload.data}
          progress={upload.data.progress}
          error={upload.error}
        />
      ))}
    </div>
  )
}
```

---

## Accessibility

All state components include proper ARIA attributes:

- **Loading**: `role="status" aria-live="polite" aria-busy="true"`
- **Error**: `role="alert" aria-live="assertive"`
- **Empty**: `role="status" aria-live="polite"`
- **Skeleton**: `role="presentation" aria-hidden="true"`

---

## Testing

```tsx
import { render, screen } from '@testing-library/react'
import { EmptyState, LoadingState, ErrorState } from '@/components/ui'

describe('UI States', () => {
  it('shows empty state', () => {
    render(<EmptyState title="No items" />)
    expect(screen.getByText('No items')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<LoadingState message="Loading..." />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
  })

  it('shows error state', () => {
    render(<ErrorState title="Error occurred" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
```

---

## Next Steps

1. **Audit all features**: Replace custom states with standardized components
2. **Add transitions**: Smooth fade-in/out for state changes
3. **Performance**: Monitor optimistic update overhead
4. **Error tracking**: Integrate with observability (Wave-3)

---

**Status:** Wave-2 Complete ✅
