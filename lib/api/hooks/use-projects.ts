import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
import { apiClient } from '../client'
import { Project, Task, Bucket, CursorPaginatedResponse } from '@/types'
import { buildCursorQuery, withIdempotencyKey } from '../utils'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiClient.get<Project[]>('/projects')
      if (!res.success || !res.data) throw new Error('Failed to fetch projects')
      return res.data
    },
  })
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await apiClient.get<Project>(`/projects/${projectId}`)
      if (!res.success || !res.data) throw new Error('Failed to fetch project')
      return res.data
    },
    enabled: !!projectId,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Pick<Project, 'name' | 'description' | 'color'>) => {
      const res = await apiClient.post<Project>('/projects', data, withIdempotencyKey())
      if (!res.success || !res.data) throw new Error('Failed to create project')
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useProjectTasks(projectId: string | undefined, limit = 100) {
  return useInfiniteQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: async ({ pageParam }) => {
      const query = buildCursorQuery({
        ...(pageParam ? { cursor: pageParam } : {}),
        ...(limit ? { limit } : {}),
      })
      const res = await apiClient.get<CursorPaginatedResponse<Task>>(
        `/projects/${projectId}/tasks${query}`
      )
      if (!res.success || !res.data) throw new Error('Failed to fetch tasks')
      return res.data
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: !!projectId,
  })
}

export function useProjectBuckets(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-buckets', projectId],
    queryFn: async () => {
      const res = await apiClient.get<Bucket[]>(`/projects/${projectId}/buckets`)
      if (!res.success || !res.data) throw new Error('Failed to fetch buckets')
      return res.data
    },
    enabled: !!projectId,
  })
}

export function useUpdateTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      const res = await apiClient.patch<Task>(
        `/projects/${projectId}/tasks/${taskId}`,
        updates,
        withIdempotencyKey()
      )
      if (!res.success || !res.data) throw new Error('Failed to update task')
      return res.data
    },
    onSuccess: (saved) => {
      // Update tasks infinite list
      qc.setQueryData<InfiniteData<CursorPaginatedResponse<Task>> | undefined>(
        ['project-tasks', projectId],
        (old) => {
          if (!old) return old
          const pages = old.pages.map((p): CursorPaginatedResponse<Task> => ({
            ...p,
            items: (p.items || []).map((t: Task) => (t.id === saved.id ? { ...t, ...saved } : t)),
          }))
          return { ...old, pages }
        },
      )
      // Update bucket snapshot
      qc.setQueryData<Bucket[] | undefined>(['project-buckets', projectId], (old) => {
        if (!old || !Array.isArray(old)) return old
        return old.map((b) => ({
          ...b,
          tasks: (b.tasks || []).map((t: Task) => (t.id === saved.id ? { ...t, ...saved } : t)),
        }))
      })
    },
  })
}

export function useAddBucket(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await apiClient.post<Bucket>(
        `/projects/${projectId}/buckets`,
        { name },
        withIdempotencyKey()
      )
      if (!res.success || !res.data) throw new Error('Failed to add bucket')
      return res.data
    },
    onSuccess: (bucket) => {
      qc.setQueryData<Bucket[] | undefined>(['project-buckets', projectId], (old) => {
        if (!old || !Array.isArray(old)) return old
        return [bucket, ...old]
      })
    },
  })
}

/**
 * Move task to different bucket with order index
 */
export function useMoveTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      taskId,
      toBucketId,
      orderIndex,
    }: {
      taskId: string
      toBucketId: string
      orderIndex: number
    }) => {
      const res = await apiClient.patch<Task>(
        `/projects/${projectId}/tasks/${taskId}/move`,
        { bucketId: toBucketId, orderIndex },
        withIdempotencyKey()
      )
      if (!res.success || !res.data) throw new Error('Failed to move task')
      return res.data
    },
    onMutate: async ({ taskId, toBucketId, orderIndex }) => {
      // Cancel outgoing refetches
      await qc.cancelQueries({ queryKey: ['project-tasks', projectId] })
      await qc.cancelQueries({ queryKey: ['project-buckets', projectId] })

      // Snapshot previous value
      const previousTasks = qc.getQueryData<InfiniteData<CursorPaginatedResponse<Task>> | undefined>(['project-tasks', projectId])
      const previousBuckets = qc.getQueryData<Bucket[] | undefined>(['project-buckets', projectId])

      // Optimistically update
      qc.setQueryData<InfiniteData<CursorPaginatedResponse<Task>> | undefined>(
        ['project-tasks', projectId],
        (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page): CursorPaginatedResponse<Task> => ({
              ...page,
              items: (page.items || []).map((task: Task) =>
                task.id === taskId
                  ? { ...task, bucketId: toBucketId, order: orderIndex }
                  : task
              ),
            })),
          }
        },
      )

      return { previousTasks, previousBuckets }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        qc.setQueryData(['project-tasks', projectId], context.previousTasks)
      }
      if (context?.previousBuckets) {
        qc.setQueryData(['project-buckets', projectId], context.previousBuckets)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      qc.invalidateQueries({ queryKey: ['project-buckets', projectId] })
    },
  })
}

/**
 * Reorder tasks within same bucket
 */
export function useReorderTasks(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      bucketId,
      taskIds,
    }: {
      bucketId: string
      taskIds: string[]
    }) => {
      const res = await apiClient.post(
        `/projects/${projectId}/buckets/${bucketId}/reorder`,
        { taskIds },
        withIdempotencyKey()
      )
      if (!res.success) throw new Error('Failed to reorder tasks')
      return res.data
    },
    onMutate: async ({ bucketId, taskIds }) => {
      await qc.cancelQueries({ queryKey: ['project-buckets', projectId] })
      const previousBuckets = qc.getQueryData<Bucket[] | undefined>(['project-buckets', projectId])

      // Optimistically reorder
      qc.setQueryData<Bucket[] | undefined>(['project-buckets', projectId], (old) => {
        if (!old || !Array.isArray(old)) return old
        return old.map((bucket: Bucket) => {
          if (bucket.id !== bucketId) return bucket

          const taskMap = new Map(bucket.tasks.map((t) => [t.id, t]))
          const reorderedTasks = taskIds
            .map((id, index) => {
              const task = taskMap.get(id)
              return task ? { ...task, order: index } : null
            })
            .filter((t): t is Task => Boolean(t))

          return { ...bucket, tasks: reorderedTasks }
        })
      })

      return { previousBuckets }
    },
    onError: (err, variables, context) => {
      if (context?.previousBuckets) {
        qc.setQueryData(['project-buckets', projectId], context.previousBuckets)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['project-buckets', projectId] })
    },
  })
}

/**
 * Create new task
 */
export function useCreateTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Task> & { bucketId: string }) => {
      const res = await apiClient.post<Task>(
        `/projects/${projectId}/tasks`,
        data,
        withIdempotencyKey()
      )
      if (!res.success || !res.data) throw new Error('Failed to create task')
      return res.data
    },
    onSuccess: (saved) => {
      // Prepend to tasks infinite list
      qc.setQueryData<InfiniteData<CursorPaginatedResponse<Task>> | undefined>(
        ['project-tasks', projectId],
        (old) => {
          if (!old || !Array.isArray(old.pages) || old.pages.length === 0) return old
          const first = old.pages[0]!
          return {
            ...old,
            pages: [
              { ...first, items: [saved, ...(first.items || [])] },
              ...old.pages.slice(1),
            ],
          }
        },
      )
      // Add into bucket snapshot
      qc.setQueryData<Bucket[] | undefined>(['project-buckets', projectId], (old) => {
        if (!old || !Array.isArray(old)) return old
        return old.map((b) => (b.id === saved.bucketId ? { ...b, tasks: [saved, ...(b.tasks || [])] } : b))
      })
    },
  })
}

/**
 * Delete task
 */
export function useDeleteTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiClient.delete(`/projects/${projectId}/tasks/${taskId}`)
      if (!res.success) throw new Error('Failed to delete task')
    },
    onSuccess: (_ok, taskId) => {
      // Remove from tasks infinite list
      qc.setQueryData<InfiniteData<CursorPaginatedResponse<Task>> | undefined>(
        ['project-tasks', projectId],
        (old) => {
          if (!old) return old
          const pages = old.pages.map((p): CursorPaginatedResponse<Task> => ({
            ...p,
            items: (p.items || []).filter((t: Task) => t.id !== taskId),
          }))
          return { ...old, pages }
        },
      )
      // Remove from buckets snapshot
      qc.setQueryData<Bucket[] | undefined>(['project-buckets', projectId], (old) => {
        if (!old || !Array.isArray(old)) return old
        return old.map((b) => ({
          ...b,
          tasks: (b.tasks || []).filter((t: Task) => t.id !== taskId),
        }))
      })
    },
  })
}
