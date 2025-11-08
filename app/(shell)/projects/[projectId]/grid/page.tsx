'use client'

import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { Project, type Task } from '@/types'

const ProjectGridView = dynamic(
  () => import('@/features/projects/components/project-grid-view').then(m => m.ProjectGridView),
  { ssr: false, loading: () => <div className="min-h-[420px] w-full animate-pulse rounded-lg bg-muted/30" /> }
)

interface ProjectGridPageProps {
  params: {
    projectId: string
  }
}

export default function ProjectGridPage({ params }: ProjectGridPageProps) {
  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', params.projectId],
    queryFn: async () => {
      const response = await apiClient.get<Project>(`/projects/${params.projectId}`)
      return response.data!
    },
  })

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    await apiClient.patch(`/projects/${params.projectId}/tasks/${taskId}`, updates)
  }

  return (
    <div className="container max-w-7xl py-6">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {project?.name || 'Project'} - Grid View
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage tasks in a spreadsheet-like grid with sorting and filtering
          </p>
        </div>

        {/* Grid View */}
        <ProjectGridView
          projectId={params.projectId}
          tasks={project?.buckets.flatMap(b => b.tasks) || []}
          buckets={project?.buckets || []}
          onTaskUpdate={handleTaskUpdate}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
