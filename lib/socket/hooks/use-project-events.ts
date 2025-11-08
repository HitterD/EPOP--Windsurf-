'use client'

import { useCallback } from 'react'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { SOCKET_EVENTS } from '@/lib/constants'
import { ProjectTaskEvent, Task, type CursorPaginatedResponse, type Bucket } from '@/types'
import { useDomainEvents } from './use-domain-events'
import { applyPatch, upsertItem, removeById } from './use-domain-events'

/**
 * Hook to handle project task events and synchronize across all views
 * (Board, Grid, Gantt, Schedule)
 */
export function useProjectTaskEvents(projectId: string, enabled = true) {
  const queryClient = useQueryClient()

  // Listen to task created events
  useDomainEvents<ProjectTaskEvent>({
    eventType: SOCKET_EVENTS.PROJECT_TASK_CREATED,
    enabled,
    onEvent: useCallback(
      (event: ProjectTaskEvent) => {
        const taskEvent = event
        if (taskEvent.projectId === projectId && taskEvent.patch) {
          const newTask = taskEvent.patch as Task

          // Update infinite query cache
          queryClient.setQueryData<InfiniteData<CursorPaginatedResponse<Task>> | undefined>(
            ['project-tasks', projectId],
            (oldData) => {
              if (!oldData || !Array.isArray(oldData.pages) || oldData.pages.length === 0) return oldData
              const firstPage = oldData.pages[0]!
              return {
                ...oldData,
                pages: [
                  {
                    ...firstPage,
                    items: [newTask, ...(firstPage.items || [])],
                  },
                  ...oldData.pages.slice(1),
                ],
              }
            },
          )

          // Update project detail cache
          queryClient.invalidateQueries({ queryKey: ['project', projectId] })
        }
      },
      [projectId, queryClient]
    ),
  })

  // Listen to task updated events
  useDomainEvents<ProjectTaskEvent>({
    eventType: SOCKET_EVENTS.PROJECT_TASK_UPDATED,
    enabled,
    onEvent: useCallback(
      (event: ProjectTaskEvent) => {
        const taskEvent = event
        if (taskEvent.projectId === projectId && taskEvent.patch) {
          // Update task in infinite query cache
          queryClient.setQueryData<InfiniteData<CursorPaginatedResponse<Task>> | undefined>(
            ['project-tasks', projectId],
            (oldData) => {
              if (!oldData) return oldData
              return {
                ...oldData,
                pages: oldData.pages.map((page): CursorPaginatedResponse<Task> => ({
                  ...page,
                  items: applyPatch(page.items, taskEvent.taskId, taskEvent.patch as Partial<Task>),
                })),
              }
            },
          )

          // Update project buckets if bucket data is cached
          queryClient.setQueryData<Bucket[] | undefined>(['project-buckets', projectId], (oldData) => {
            if (!oldData || !Array.isArray(oldData)) return oldData
            return oldData.map((bucket: Bucket) => ({
              ...bucket,
              tasks: bucket.tasks
                ? applyPatch(bucket.tasks, taskEvent.taskId, taskEvent.patch as Partial<Task>)
                : bucket.tasks,
            }))
          })

          // Invalidate project detail to refresh summary stats
          queryClient.invalidateQueries({ queryKey: ['project', projectId] })
        }
      },
      [projectId, queryClient]
    ),
  })

  // Listen to task moved events (bucket changes, reordering)
  useDomainEvents<ProjectTaskEvent>({
    eventType: SOCKET_EVENTS.PROJECT_TASK_MOVED,
    enabled,
    onEvent: useCallback(
      (event: ProjectTaskEvent) => {
        const taskEvent = event
        if (taskEvent.projectId === projectId) {
          // For task moves, we need to refresh both tasks and buckets
          queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] })
          queryClient.invalidateQueries({ queryKey: ['project-buckets', projectId] })
          queryClient.invalidateQueries({ queryKey: ['project', projectId] })
        }
      },
      [projectId, queryClient]
    ),
  })

  // Listen to task deleted events
  useDomainEvents<ProjectTaskEvent>({
    eventType: SOCKET_EVENTS.PROJECT_TASK_DELETED,
    enabled,
    onEvent: useCallback(
      (event: ProjectTaskEvent) => {
        const taskEvent = event
        if (taskEvent.projectId === projectId) {
          // Remove task from infinite query cache
          queryClient.setQueryData<InfiniteData<CursorPaginatedResponse<Task>> | undefined>(
            ['project-tasks', projectId],
            (oldData) => {
              if (!oldData) return oldData
              return {
                ...oldData,
                pages: oldData.pages.map((page): CursorPaginatedResponse<Task> => ({
                  ...page,
                  items: removeById(page.items, taskEvent.taskId),
                })),
              }
            },
          )

          // Remove from buckets
          queryClient.setQueryData<Bucket[] | undefined>(['project-buckets', projectId], (oldData) => {
            if (!oldData || !Array.isArray(oldData)) return oldData
            return oldData.map((bucket: Bucket) => ({
              ...bucket,
              tasks: bucket.tasks ? removeById(bucket.tasks, taskEvent.taskId) : bucket.tasks,
            }))
          })

          queryClient.invalidateQueries({ queryKey: ['project', projectId] })
        }
      },
      [projectId, queryClient]
    ),
  })
}

/**
 * Hook to handle optimistic task updates with rollback
 */
export function useOptimisticTaskUpdate(projectId: string) {
  const queryClient = useQueryClient()

  const updateTaskOptimistically = useCallback(
    (taskId: string, updates: Partial<Task>) => {
      const previousData = queryClient.getQueryData<InfiniteData<CursorPaginatedResponse<Task>> | undefined>(['project-tasks', projectId])

      // Optimistically update the cache
      queryClient.setQueryData<InfiniteData<CursorPaginatedResponse<Task>> | undefined>(
        ['project-tasks', projectId],
        (oldData) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            pages: oldData.pages.map((page): CursorPaginatedResponse<Task> => ({
              ...page,
              items: applyPatch(page.items, taskId, updates),
            })),
          }
        },
      )

      // Return rollback function
      return () => {
        queryClient.setQueryData(['project-tasks', projectId], previousData)
      }
    },
    [projectId, queryClient]
  )

  return { updateTaskOptimistically }
}
