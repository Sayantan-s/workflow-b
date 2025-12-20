import type { Node, Edge } from "@vue-flow/core";

// ============ NODE TYPES ============
export const WorkflowNodeType = {
  TRIGGER_MANUAL: "trigger:manual",
  TRIGGER_WEBHOOK: "trigger:webhook",
  ACTION_HTTP: "action:http",
  ACTION_EMAIL: "action:email",
  ACTION_SMS: "action:sms",
  LOGIC_IF_ELSE: "logic:if-else",
  LOGIC_DELAY: "logic:delay",
  LOGIC_TRANSFORM: "logic:transform",
} as const;

export type WorkflowNodeType =
  (typeof WorkflowNodeType)[keyof typeof WorkflowNodeType];

// ============ EXECUTION STATUS ============
export const WorkflowExecutionStatus = {
  IDLE: "idle",
  RUNNING: "running",
  SUCCESS: "success",
  ERROR: "error",
} as const;

export type WorkflowExecutionStatus =
  (typeof WorkflowExecutionStatus)[keyof typeof WorkflowExecutionStatus];

// ============ AUTH SETTINGS ============
export type AuthType = "none" | "basic" | "api-key";

export interface AuthNone {
  type: "none";
}

export interface AuthBasic {
  type: "basic";
  username: string;
  password: string;
}

export interface AuthApiKey {
  type: "api-key";
  key: string;
  value: string;
  location: "header" | "query";
}

export type AuthSettings = AuthNone | AuthBasic | AuthApiKey;

// ============ HTTP METHODS ============
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// ============ BASE NODE DATA ============
export interface BaseNodeData {
  label: string;
  description?: string;
  isValid: boolean;
  executionStatus?: WorkflowExecutionStatus;
  lastExecutedAt?: string;
}

// ============ TRIGGER NODES ============
export interface ManualTriggerData extends BaseNodeData {
  type: typeof WorkflowNodeType.TRIGGER_MANUAL;
}

export interface WebhookTriggerData extends BaseNodeData {
  type: typeof WorkflowNodeType.TRIGGER_WEBHOOK;
  webhookUrl: string;
  method: HttpMethod;
  auth: AuthSettings;
}

// ============ ACTION NODES ============
export interface HttpActionData extends BaseNodeData {
  type: typeof WorkflowNodeType.ACTION_HTTP;
  url: string;
  method: HttpMethod;
  auth: AuthSettings;
  bodyType: "json" | "raw";
  body?: string;
  timeout: number;
}

export interface EmailActionData extends BaseNodeData {
  type: typeof WorkflowNodeType.ACTION_EMAIL;
  recipients: {
    to: string[];
    cc: string[];
    bcc: string[];
  };
  subject: string;
  body: string;
  bodyFormat: "richtext" | "markdown" | "plaintext";
  attachments: string[];
}

export interface SmsActionData extends BaseNodeData {
  type: typeof WorkflowNodeType.ACTION_SMS;
  fromNumber: string;
  toNumber: string;
  message: string;
}

// ============ LOGIC NODES ============
export type ConditionOperator = "equals" | "notEquals" | "contains" | "gt" | "lt" | "isEmpty";
export type ConditionValueType = "string" | "number" | "boolean";

export interface Condition {
  field: string;
  operator: ConditionOperator;
  valueType: ConditionValueType;
  value: string;
  logicalOp?: "AND" | "OR";
}

export interface IfElseLogicData extends BaseNodeData {
  type: typeof WorkflowNodeType.LOGIC_IF_ELSE;
  conditions: Condition[];
}

export type DelayUnit = "seconds" | "minutes" | "hours" | "days";

export interface DelayLogicData extends BaseNodeData {
  type: typeof WorkflowNodeType.LOGIC_DELAY;
  delayUnit: DelayUnit;
  delayValue: number;
}

// ============ TRANSFORM/MAPPER NODE ============
export interface VariableMapping {
  id: string;
  sourcePath: string; // JSONPath expression (e.g., "$.response.data.userId")
  variableName: string; // Variable name to store the value (e.g., "userId")
  defaultValue?: string; // Fallback value if path doesn't exist
}

export interface TransformLogicData extends BaseNodeData {
  type: typeof WorkflowNodeType.LOGIC_TRANSFORM;
  mappings: VariableMapping[];
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
  | TransformLogicData;

export type NodeType = WorkflowNodeType;

// ============ WORKFLOW NODE ============
export type WorkflowNode = Node<WorkflowNodeData>;

// ============ WORKFLOW EDGE ============
export type WorkflowEdge = Edge & {
  data?: {
    condition?: "true" | "false" | "success" | "error";
    label?: string | null;
  };
  style?: {
    stroke?: string;
    strokeWidth?: number;
  };
};

// ============ NODE CATEGORY ============
export type NodeCategory = "trigger" | "action" | "logic";

export interface NodeDefinition {
  type: WorkflowNodeType;
  label: string;
  description: string;
  category: NodeCategory;
  icon: string;
  color: string;
  shortcut?: string;
}

// Node definitions registry
export const NODE_DEFINITIONS: NodeDefinition[] = [
  // Triggers
  {
    type: WorkflowNodeType.TRIGGER_MANUAL,
    label: "Manual Trigger",
    description: "Runs workflow on button click",
    category: "trigger",
    icon: "▶️",
    color: "#22c55e",
    shortcut: "Cmd+N+D",
  },
  {
    type: WorkflowNodeType.TRIGGER_WEBHOOK,
    label: "Webhook",
    description: "Triggers on HTTP webhook",
    category: "trigger",
    icon: "🔗",
    color: "#22c55e",
    shortcut: "Cmd+N+F",
  },
  // Actions
  {
    type: WorkflowNodeType.ACTION_HTTP,
    label: "HTTP Request",
    description: "Make an HTTP request",
    category: "action",
    icon: "🌐",
    color: "#3b82f6",
    shortcut: "Cmd+N+G",
  },
  {
    type: WorkflowNodeType.ACTION_EMAIL,
    label: "Send Email",
    description: "Send an email",
    category: "action",
    icon: "📧",
    color: "#3b82f6",
    shortcut: "Cmd+N+H",
  },
  {
    type: WorkflowNodeType.ACTION_SMS,
    label: "Send SMS",
    description: "Send an SMS message",
    category: "action",
    icon: "💬",
    color: "#3b82f6",
    shortcut: "Cmd+N+J",
  },
  // Logic
  {
    type: WorkflowNodeType.LOGIC_IF_ELSE,
    label: "If/Else",
    description: "Conditional branching",
    category: "logic",
    icon: "🔀",
    color: "#f59e0b",
    shortcut: "Cmd+N+K",
  },
  {
    type: WorkflowNodeType.LOGIC_DELAY,
    label: "Delay",
    description: "Wait before continuing",
    category: "logic",
    icon: "⏱️",
    color: "#f59e0b",
    shortcut: "Cmd+N+L",
  },
  {
    type: WorkflowNodeType.LOGIC_TRANSFORM,
    label: "Transform",
    description: "Extract and map data to variables",
    category: "logic",
    icon: "🔄",
    color: "#f59e0b",
    shortcut: "Cmd+N+T",
  },
];
