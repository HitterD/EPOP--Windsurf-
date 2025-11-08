'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { WorkflowNode } from '../types/workflow'
import { Trash2 } from 'lucide-react'

interface NodeInspectorProps {
  node: WorkflowNode | null
  onUpdate: (nodeId: string, config: Record<string, unknown>) => void
  onDelete: (nodeId: string) => void
}

export function NodeInspector({ node, onUpdate, onDelete }: NodeInspectorProps) {
  if (!node) {
    return (
      <Card className="h-full w-80 flex-shrink-0">
        <CardHeader>
          <CardTitle className="text-base">Node Inspector</CardTitle>
          <CardDescription>Select a node to configure</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[calc(100%-80px)] items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="mb-2 text-4xl opacity-20">⚙️</div>
            <p className="text-sm">No node selected</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full w-80 flex-shrink-0">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{node.label}</CardTitle>
            <Badge variant="outline" className="mt-1 text-xs">
              {node.type}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => onDelete(node.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-4">
            {/* Node-specific configuration */}
            {node.nodeType === 'task_created' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="projectId">Project (optional)</Label>
                  <Input
                    id="projectId"
                    placeholder="Filter by project ID"
                    value={String((node.config as Record<string, unknown>)?.projectId ?? '')}
                    onChange={(e) =>
                      onUpdate(node.id, { ...node.config, projectId: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={String((node.config as Record<string, unknown>)?.priority ?? '')}
                    onChange={(e) =>
                      onUpdate(node.id, { ...node.config, priority: e.target.value })
                    }
                  >
                    <option value="">Any</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </>
            )}

            {node.nodeType === 'send_email' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="to">To (email)</Label>
                  <Input
                    id="to"
                    type="email"
                    placeholder="recipient@example.com"
                    value={String((node.config as Record<string, unknown>)?.to ?? '')}
                    onChange={(e) => onUpdate(node.id, { ...node.config, to: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Email subject"
                    value={String((node.config as Record<string, unknown>)?.subject ?? '')}
                    onChange={(e) =>
                      onUpdate(node.id, { ...node.config, subject: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Body</Label>
                  <Textarea
                    id="body"
                    placeholder="Email content"
                    rows={4}
                    value={String((node.config as Record<string, unknown>)?.body ?? '')}
                    onChange={(e) => onUpdate(node.id, { ...node.config, body: e.target.value })}
                  />
                </div>
              </>
            )}

            {node.nodeType === 'compare' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="field">Field</Label>
                  <Input
                    id="field"
                    placeholder="e.g., task.priority"
                    value={String((node.config as Record<string, unknown>)?.field ?? '')}
                    onChange={(e) => onUpdate(node.id, { ...node.config, field: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="operator">Operator</Label>
                  <select
                    id="operator"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={String((node.config as Record<string, unknown>)?.operator ?? 'equals')}
                    onChange={(e) =>
                      onUpdate(node.id, { ...node.config, operator: e.target.value })
                    }
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not Equals</option>
                    <option value="greater_than">Greater Than</option>
                    <option value="less_than">Less Than</option>
                    <option value="contains">Contains</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Value</Label>
                  <Input
                    id="value"
                    placeholder="Comparison value"
                    value={String((node.config as Record<string, unknown>)?.value ?? '')}
                    onChange={(e) => onUpdate(node.id, { ...node.config, value: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* Generic fallback for unconfigured nodes */}
            {!['task_created', 'send_email', 'compare'].includes(node.nodeType) && (
              <div className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
                Configuration options coming soon for {node.nodeType}
              </div>
            )}

            {/* Node info */}
            <div className="space-y-2 rounded-lg border p-3 text-xs">
              <div className="font-semibold">Node Info</div>
              <div className="space-y-1 text-muted-foreground">
                <div>ID: {node.id.slice(0, 8)}...</div>
                <div>Type: {node.nodeType}</div>
                <div>
                  Position: ({Math.round(node.position.x)}, {Math.round(node.position.y)})
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
