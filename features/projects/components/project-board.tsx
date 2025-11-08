'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Task } from '@/types'
import { TaskCard } from './task-card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectBuckets, useProjectTasks, useAddBucket, useMoveTask, useReorderTasks } from '@/lib/api/hooks/use-projects'
import { useSocket } from '@/lib/socket/hooks/use-socket'
import { useProjectTaskEvents } from '@/lib/socket/hooks/use-project-events'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import type { CursorPaginatedResponse } from '@/types'

interface ProjectBoardProps {
  projectId: string
}

export function ProjectBoard({ projectId }: ProjectBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const { data: buckets } = useProjectBuckets(projectId)
  const { data: tasksData } = useProjectTasks(projectId)
  const tasks = useMemo(() => {
    const pages = (tasksData?.pages || []) as Array<CursorPaginatedResponse<Task>>
    return pages.flatMap((p) => p.items || [])
  }, [tasksData])
  const addBucket = useAddBucket(projectId)
  const moveTask = useMoveTask(projectId)
  const reorderTasks = useReorderTasks(projectId)
  const { socket } = useSocket()
  const qc = useQueryClient()
  useProjectTaskEvents(projectId, true)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t: Task) => t.id === event.active.id)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string
    const current = tasks.find((t: Task) => t.id === taskId)
    if (!current) return
    const fromBucketId = current.bucketId
    const overTask = tasks.find((t: Task) => t.id === overId)
    const toBucketId = overTask ? overTask.bucketId : fromBucketId

    if (toBucketId !== fromBucketId) {
      // Move across buckets with order index at over task position (or 0)
      const toTasks = tasks.filter((t: Task) => t.bucketId === toBucketId).map((t) => t.id)
      const orderIndex = overTask ? toTasks.indexOf(overTask.id) : 0

      // Optimistic: update bucketId
      const cacheKey = ['project-tasks', projectId] as const
      const prev = qc.getQueryData<InfiniteData<CursorPaginatedResponse<Task>> | undefined>(cacheKey)
      qc.setQueryData<InfiniteData<CursorPaginatedResponse<Task>> | undefined>(cacheKey, (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page): CursorPaginatedResponse<Task> => ({
            ...page,
            items: (page.items || []).map((t: Task) => (t.id === taskId ? { ...t, bucketId: toBucketId } : t)),
          })),
        }
      })

      moveTask.mutate(
        { taskId, toBucketId, orderIndex },
        {
          onError: () => {
            if (prev) qc.setQueryData(cacheKey, prev)
          },
          onSettled: () => {
            qc.invalidateQueries({ queryKey: cacheKey })
            qc.invalidateQueries({ queryKey: ['project-buckets', projectId] })
          },
        }
      )
    } else {
      // Reorder within same bucket
      const list = tasks.filter((t: Task) => t.bucketId === fromBucketId).map((t) => t.id)
      const fromIndex = list.indexOf(taskId)
      const overIndex = list.indexOf(overId)
      if (fromIndex === -1 || overIndex === -1 || fromIndex === overIndex) return
      const newList = [...list]
      newList.splice(fromIndex, 1)
      newList.splice(overIndex, 0, taskId)
      reorderTasks.mutate({ bucketId: fromBucketId, taskIds: newList })
    }
  }

  // Join/leave project room
  useEffect(() => {
    if (!socket) return
    socket.emit('join_project', projectId)
    return () => {
      socket.emit('leave_project', projectId)
    }
  }, [socket, projectId])

  // Domain events (useProjectTaskEvents) will update caches across views

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-4 overflow-x-auto p-6">
        {(buckets || []).map((bucket) => {
          const bucketTasks: Task[] = tasks.filter((task: Task) => task.bucketId === bucket.id)

          return (
            <div key={bucket.id} className="flex w-80 shrink-0 flex-col">
              {/* Bucket header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-muted" />
                  <h3 className="font-semibold">{bucket.name}</h3>
                  <span className="text-sm text-muted-foreground">{bucketTasks.length}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => addBucket.mutate(`New Bucket ${Date.now() % 1000}`)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Drop zone */}
              <SortableContext
                id={bucket.id}
                items={bucketTasks.map((t: Task) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  className={cn(
                    'flex-1 space-y-2 rounded-lg bg-muted/30 p-2',
                    'min-h-[200px]'
                  )}
                >
                  {bucketTasks.map((task: Task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </SortableContext>
            </div>
          )
        })}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}
