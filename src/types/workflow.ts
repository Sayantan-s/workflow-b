import type { Node, Edge } from '@vue-flow/core'

// ============ AUTH SETTINGS ============
export type AuthType = 'none' | 'basic' | 'api-key'

export interface AuthNone {
  type: 'none'
}

export interface AuthBasic {
  type: 'basic'
  username: string
  password: string
}

export interface AuthApiKey {
  type: 'api-key'
  key: string
  value: string
  location: 'header' | 'query'
}

export type AuthSettings = AuthNone | AuthBasic | AuthApiKey

// ============ HTTP METHODS ============
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

// ============ BASE NODE DATA ============
export interface BaseNodeData {
  label: string
  description?: string
  isValid: boolean
  executionStatus?: 'idle' | 'running' | 'success' | 'error'
  lastExecutedAt?: string
}

// ============ TRIGGER NODES ============
export interface ManualTriggerData extends BaseNodeData {
  type: 'trigger:manual'
}

export interface WebhookTriggerData extends BaseNodeData {
  type: 'trigger:webhook'
  webhookUrl: string
  method: HttpMethod
  auth: AuthSettings
}

// ============ ACTION NODES ============
export interface HttpActionData extends BaseNodeData {
  type: 'action:http'
  url: string
  method: HttpMethod
  auth: AuthSettings
  bodyType: 'json' | 'raw'
  body?: string
  timeout: number
}

export interface EmailActionData extends BaseNodeData {
  type: 'action:email'
  recipients: {
    to: string[]
    cc: string[]
    bcc: string[]
  }
  subject: string
  body: string
  bodyFormat: 'richtext' | 'markdown' | 'plaintext'
  attachments: string[]
}

export interface SmsActionData extends BaseNodeData {
  type: 'action:sms'
  toNumber: string
  message: string
}

// ============ LOGIC NODES ============
export interface Condition {
  field: string
  operator: 'equals' | 'notEquals' | 'contains' | 'gt' | 'lt' | 'isEmpty'
  value: string
  logicalOp?: 'AND' | 'OR'
}

export interface IfElseLogicData extends BaseNodeData {
  type: 'logic:if-else'
  conditions: Condition[]
}

export interface DelayLogicData extends BaseNodeData {
  type: 'logic:delay'
  delayType: 'hours' | 'days'
  delayValue: number
}

// ============ UNION TYPES ============
export type WorkflowNodeData =
  | ManualTriggerData
  | WebhookTriggerData
  | HttpActionData
  | EmailActionData
  | SmsActionData
  | IfElseLogicData
  | DelayLogicData

export type NodeType = WorkflowNodeData['type']

// ============ WORKFLOW NODE ============
export interface WorkflowNode extends Node {
  data: WorkflowNodeData
}

// ============ WORKFLOW EDGE ============
export interface WorkflowEdge extends Edge {
  data?: {
    condition?: 'true' | 'false'
  }
}

// ============ NODE CATEGORY ============
export type NodeCategory = 'trigger' | 'action' | 'logic'

export interface NodeDefinition {
  type: NodeType
  label: string
  description: string
  category: NodeCategory
  icon: string
  color: string
  shortcut?: string
}

// Node definitions registry
export const NODE_DEFINITIONS: NodeDefinition[] = [
  // Triggers
  {
    type: 'trigger:manual',
    label: 'Manual Trigger',
    description: 'Runs workflow on button click',
    category: 'trigger',
    icon: '▶️',
    color: '#22c55e',
    shortcut: 'Cmd+N+D',
  },
  {
    type: 'trigger:webhook',
    label: 'Webhook',
    description: 'Triggers on HTTP webhook',
    category: 'trigger',
    icon: '🔗',
    color: '#22c55e',
    shortcut: 'Cmd+N+F',
  },
  // Actions
  {
    type: 'action:http',
    label: 'HTTP Request',
    description: 'Make an HTTP request',
    category: 'action',
    icon: '🌐',
    color: '#3b82f6',
    shortcut: 'Cmd+N+G',
  },
  {
    type: 'action:email',
    label: 'Send Email',
    description: 'Send an email',
    category: 'action',
    icon: '📧',
    color: '#3b82f6',
    shortcut: 'Cmd+N+H',
  },
  {
    type: 'action:sms',
    label: 'Send SMS',
    description: 'Send an SMS message',
    category: 'action',
    icon: '💬',
    color: '#3b82f6',
    shortcut: 'Cmd+N+J',
  },
  // Logic
  {
    type: 'logic:if-else',
    label: 'If/Else',
    description: 'Conditional branching',
    category: 'logic',
    icon: '🔀',
    color: '#f59e0b',
    shortcut: 'Cmd+N+K',
  },
  {
    type: 'logic:delay',
    label: 'Delay',
    description: 'Wait before continuing',
    category: 'logic',
    icon: '⏱️',
    color: '#f59e0b',
    shortcut: 'Cmd+N+L',
  },
]

