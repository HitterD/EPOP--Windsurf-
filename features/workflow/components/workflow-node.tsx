'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Settings } from 'lucide-react'
import { WorkflowNode as WorkflowNodeType } from '../types/workflow'

interface WorkflowNodeProps {
  node: WorkflowNodeType
  onSelect: (id: string) => void
  isSelected: boolean
}

export function WorkflowNode({ node, onSelect, isSelected }: WorkflowNodeProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: node.id,
    data: { node },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    position: 'absolute' as const,
    left: node.position.x,
    top: node.position.y,
    opacity: isDragging ? 0.5 : 1,
  }

  const getNodeColor = () => {
    switch (node.type) {
      case 'trigger':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
      case 'condition':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
      case 'action':
        return 'border-green-500 bg-green-50 dark:bg-green-950/20'
      default:
        return ''
    }
  }

  const getBadgeVariant = () => {
    switch (node.type) {
      case 'trigger':
        return 'default' as const
      case 'condition':
        return 'secondary' as const
      case 'action':
        return 'outline' as const
    }
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className={`w-48 cursor-pointer border-2 transition-shadow ${getNodeColor()} ${
          isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
        }`}
        onClick={() => onSelect(node.id)}
      >
        <div className="p-3">
          {/* Header with drag handle */}
          <div className="mb-2 flex items-center justify-between">
            <Badge variant={getBadgeVariant()} className="text-xs">
              {node.type}
            </Badge>
            <div {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Node content */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{String((node.config as Record<string, unknown>)?.icon ?? '📦')}</span>
              <div className="flex-1 truncate text-sm font-semibold">{node.label}</div>
            </div>
            {node.config && Object.keys(node.config).length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Settings className="h-3 w-3" />
                <span>Configured</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
