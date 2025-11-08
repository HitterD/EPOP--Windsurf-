/**
 * Workflow Automation Types
 * Wave-3: Type definitions for workflow nodes and connections
 */

export type NodeType = 'trigger' | 'condition' | 'action'

export interface WorkflowNode {
  id: string
  type: NodeType
  nodeType: string // e.g., 'task_created', 'compare', 'send_email'
  label: string
  position: { x: number; y: number }
  config: Record<string, unknown>
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
}

export interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused'
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt: string
  updatedAt: string
}

export interface NodeDefinition {
  type: NodeType
  nodeType: string
  label: string
  description: string
  icon: string
  config?: Record<string, unknown>
}

// Node definitions for palette
export const triggerNodes: NodeDefinition[] = [
  {
    type: 'trigger',
    nodeType: 'task_created',
    label: 'Task Created',
    description: 'Trigger when a new task is created',
    icon: '✓',
  },
  {
    type: 'trigger',
    nodeType: 'message_mention',
    label: 'Message Mention',
    description: 'Trigger when someone mentions you',
    icon: '💬',
  },
  {
    type: 'trigger',
    nodeType: 'event_due',
    label: 'Event Due',
    description: 'Trigger when an event is due',
    icon: '📅',
  },
]

export const conditionNodes: NodeDefinition[] = [
  {
    type: 'condition',
    nodeType: 'compare',
    label: 'Compare Values',
    description: 'Compare two values with operators',
    icon: '=',
  },
  {
    type: 'condition',
    nodeType: 'contains',
    label: 'Contains Text',
    description: 'Check if text contains substring',
    icon: '🔍',
  },
  {
    type: 'condition',
    nodeType: 'if_then',
    label: 'If/Then',
    description: 'Conditional branching logic',
    icon: '🔀',
  },
]

export const actionNodes: NodeDefinition[] = [
  {
    type: 'action',
    nodeType: 'send_email',
    label: 'Send Email',
    description: 'Send an email notification',
    icon: '📧',
  },
  {
    type: 'action',
    nodeType: 'create_task',
    label: 'Create Task',
    description: 'Create a new task',
    icon: '➕',
  },
  {
    type: 'action',
    nodeType: 'move_task',
    label: 'Move Task',
    description: 'Move task to another bucket',
    icon: '→',
  },
  {
    type: 'action',
    nodeType: 'notify_user',
    label: 'Notify User',
    description: 'Send notification to user',
    icon: '🔔',
  },
]

export const allNodeDefinitions = [...triggerNodes, ...conditionNodes, ...actionNodes]
