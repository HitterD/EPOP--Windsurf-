"use client"

import * as React from "react"
import { ChevronRight, ChevronDown, Folder, File } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface TreeNode {
  id: string
  label: string
  icon?: React.ReactNode
  children?: TreeNode[]
  data?: unknown
}

interface TreeViewProps {
  data: TreeNode[]
  onSelect?: (node: TreeNode) => void
  selectedId?: string
  className?: string
  expandedIds?: string[]
  onExpandedChange?: (expandedIds: string[]) => void
  defaultExpandAll?: boolean
}

export function TreeView({
  data,
  onSelect,
  selectedId,
  className,
  expandedIds: controlledExpandedIds,
  onExpandedChange,
  defaultExpandAll = false,
}: TreeViewProps) {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => {
    if (defaultExpandAll) {
      const getAllIds = (nodes: TreeNode[]): string[] =>
        nodes.flatMap((n) => [n.id, ...(n.children ? getAllIds(n.children) : [])])
      return new Set(getAllIds(data))
    }
    return new Set<string>()
  })

  const expanded = controlledExpandedIds ? new Set(controlledExpandedIds) : expandedIds

  const toggle = (id: string) => {
    const newExpanded = new Set(expanded)
    newExpanded.has(id) ? newExpanded.delete(id) : newExpanded.add(id)
    controlledExpandedIds
      ? onExpandedChange?.(Array.from(newExpanded))
      : setExpandedIds(newExpanded)
  }

  const renderNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const hasChildren = Boolean(node.children?.length)
    const isExpanded = expanded.has(node.id)
    const isSelected = selectedId === node.id

    return (
      <React.Fragment key={node.id}>
        <div
          className={cn(
            "flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer hover:bg-accent",
            isSelected && "bg-accent text-accent-foreground"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => onSelect?.(node)}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation()
                toggle(node.id)
              }}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : (
            <span className="w-5" />
          )}
          <span className="text-muted-foreground">
            {node.icon || (hasChildren ? <Folder className="h-4 w-4" /> : <File className="h-4 w-4" />)}
          </span>
          <span className="text-sm truncate flex-1">{node.label}</span>
        </div>
        {hasChildren && isExpanded && node.children!.map((child) => renderNode(child, level + 1))}
      </React.Fragment>
    )
  }

  return <div className={cn("w-full overflow-auto", className)}>{data.map((node) => renderNode(node))}</div>
}
