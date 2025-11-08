'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Plus, Play, Save, FileJson } from 'lucide-react'
import { NodePalette } from '@/features/workflow/components/node-palette'
import { WorkflowCanvas } from '@/features/workflow/components/workflow-canvas'
import { NodeInspector } from '@/features/workflow/components/node-inspector'
import { WorkflowNode, WorkflowDefinition } from '@/features/workflow/types/workflow'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'

export default function AutomationPage() {
  const [workflowName, setWorkflowName] = useState('Untitled Workflow')
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const handleAddNode = (
    nodeType: string,
    type: 'trigger' | 'condition' | 'action',
    label: string,
    icon: string
  ) => {
    const newNode: WorkflowNode = {
      id: nanoid(),
      type,
      nodeType,
      label,
      position: {
        x: 100 + nodes.length * 50,
        y: 100 + nodes.length * 50,
      },
      config: { icon },
    }

    setNodes([...nodes, newNode])
    setSelectedNodeId(newNode.id)
    setHasChanges(true)
    toast.success(`Added ${label} node`)
  }

  const handleNodesChange = (updatedNodes: WorkflowNode[]) => {
    setNodes(updatedNodes)
    setHasChanges(true)
  }

  const handleUpdateNode = (nodeId: string, config: Record<string, unknown>) => {
    setNodes(nodes.map((node) => (node.id === nodeId ? { ...node, config } : node)))
    setHasChanges(true)
  }

  const handleDeleteNode = (nodeId: string) => {
    setNodes(nodes.filter((node) => node.id !== nodeId))
    setSelectedNodeId(null)
    setHasChanges(true)
    toast.success('Node deleted')
  }

  const handleSave = () => {
    const workflow: WorkflowDefinition = {
      id: nanoid(),
      name: workflowName,
      status: 'draft',
      nodes,
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // In production: await saveWorkflow(workflow)
    console.log('Saving workflow:', workflow)
    toast.success('Workflow saved as draft')
    setHasChanges(false)
  }

  const handleTestRun = () => {
    if (nodes.length === 0) {
      toast.error('Add at least one node to test')
      return
    }

    // In production: await testWorkflow({ nodes, edges: [] })
    toast.info('Test run started (mock)')
    setTimeout(() => {
      toast.success('Test run completed successfully')
    }, 2000)
  }

  const handleExportJSON = () => {
    const workflow = {
      name: workflowName,
      nodes,
      edges: [],
    }

    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${workflowName.toLowerCase().replace(/\s+/g, '-')}.json`
    link.click()
    URL.revokeObjectURL(url)

    toast.success('Workflow exported')
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <div>
            <Input
              value={workflowName}
              onChange={(e) => {
                setWorkflowName(e.target.value)
                setHasChanges(true)
              }}
              className="text-lg font-semibold"
            />
          </div>
          <Badge variant={hasChanges ? 'secondary' : 'outline'}>
            {hasChanges ? 'Unsaved' : 'Saved'}
          </Badge>
          <Badge variant="outline">{nodes.length} nodes</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportJSON} disabled={nodes.length === 0}>
            <FileJson className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleTestRun} disabled={nodes.length === 0}>
            <Play className="mr-2 h-4 w-4" />
            Test Run
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
        </div>
      </div>

      {/* Main content: Palette | Canvas | Inspector */}
      <div className="flex flex-1 overflow-hidden">
        {/* Node Palette */}
        <NodePalette onAddNode={handleAddNode} />

        {/* Canvas */}
        <div className="flex-1">
          <WorkflowCanvas
            nodes={nodes}
            onNodesChange={handleNodesChange}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        </div>

        {/* Node Inspector */}
        <NodeInspector node={selectedNode} onUpdate={handleUpdateNode} onDelete={handleDeleteNode} />
      </div>
    </div>
  )
}
