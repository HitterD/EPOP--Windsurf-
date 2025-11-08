'use client'

import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  FilterFn,
} from '@tanstack/react-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Download, ArrowUpDown, Search, AlertCircle } from 'lucide-react'
import { Task, Bucket } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ProjectGridViewProps {
  projectId: string
  tasks: Task[]
  buckets: Bucket[]
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
  isLoading?: boolean
  error?: Error | null
  className?: string
}

export function ProjectGridView({
  projectId,
  tasks,
  buckets,
  onTaskUpdate,
  isLoading = false,
  error = null,
  className,
}: ProjectGridViewProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columnHelper = useMemo(() => createColumnHelper<Task>(), [])

  // Define columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('title', {
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="hover:bg-transparent"
            >
              Task Name
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
        cell: (info) => <div className="font-medium">{info.getValue()}</div>,
      }),
      columnHelper.accessor('bucketId', {
        header: 'Status',
        cell: (info) => {
          const bucket = buckets.find((b) => b.id === info.getValue())
          const colorClass = {
            gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
            blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
            green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
            purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
          }[bucket?.color || 'gray']
          return <Badge className={colorClass}>{bucket?.name || 'Unknown'}</Badge>
        },
      }),
      columnHelper.accessor('priority', {
        header: 'Priority',
        cell: (info) => {
          const colors = {
            low: 'bg-gray-100 text-gray-800',
            medium: 'bg-blue-100 text-blue-800',
            high: 'bg-orange-100 text-orange-800',
            critical: 'bg-red-100 text-red-800',
          }
          return <Badge className={colors[info.getValue()]}>{info.getValue()}</Badge>
        },
      }),
      columnHelper.accessor('assignees', {
        header: 'Assignees',
        cell: (info) => {
          const assignees = info.getValue()
          if (!assignees || assignees.length === 0) return <span className="text-muted-foreground">Unassigned</span>
          return <span>{assignees.map((a) => a.name).join(', ')}</span>
        },
      }),
      columnHelper.accessor('dueDate', {
        header: 'Due Date',
        cell: (info) => {
          const date = info.getValue()
          if (!date) return <span className="text-muted-foreground">-</span>
          return <span>{new Date(date).toLocaleDateString()}</span>
        },
      }),
      columnHelper.accessor('progress', {
        header: 'Progress',
        cell: (info) => {
          const progress = info.getValue() || 0
          return (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs w-12 text-right">{progress}%</span>
            </div>
          )
        },
      }),
    ],
    [buckets, columnHelper]
  )

  const table = useReactTable({
    data: tasks,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  // Export to CSV
  const handleExport = () => {
    const headers = ['Title', 'Status', 'Priority', 'Assignees', 'Due Date', 'Progress']
    const rows = tasks.map(task => {
      const bucket = buckets.find(b => b.id === task.bucketId)
      return [
        task.title,
        bucket?.name || '',
        task.priority,
        task.assignees?.map(a => a.name).join('; ') || '',
        task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '',
        `${task.progress || 0}%`,
      ]
    })

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `project-${projectId}-tasks.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Exported to CSV')
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[600px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No tasks to display in grid view</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Grid View</CardTitle>
            <CardDescription>
              Manage tasks in a spreadsheet-like interface with inline editing
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold">{tasks.length}</div>
            <div className="text-xs text-muted-foreground">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {tasks.filter(t => t.status === 'done').length}
            </div>
            <div className="text-xs text-muted-foreground">Done</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {tasks.filter(t => t.status === 'in_progress').length}
            </div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">Completion</div>
          </div>
        </div>

        {/* Search Filter */}
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Results Info */}
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of {tasks.length} tasks
        </div>
      </CardContent>
    </Card>
  )
}
