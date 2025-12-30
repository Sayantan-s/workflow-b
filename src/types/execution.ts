// ============ EXECUTION TYPES ============

export type ExecutionStatus = "idle" | "running" | "success" | "error" | "skipped";

export interface ExecutionResult {
  status: ExecutionStatus;
  output?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
}

export interface NodeExecutionState {
  nodeId: string;
  status: ExecutionStatus;
  result?: ExecutionResult;
  retryCount: number;
}

export interface WorkflowExecutionContext {
  // Stores results from each node execution
  nodeResults: Record<string, unknown>;
  // Variables extracted from Transform nodes
  variables: Record<string, unknown>;
  // The execution path taken (for visualization)
  executionPath: string[];
  // Any errors encountered
  errors: Array<{ nodeId: string; message: string }>;
}

export interface ExecutionOptions {
  // Start from a specific node
  startNodeId?: string;
  // Mock mode - don't make actual API calls
  mockMode?: boolean;
  // Timeout for each node execution (ms)
  nodeTimeout?: number;
  // Maximum retry attempts per node
  maxRetries?: number;
}

// ============ NODE EXECUTOR TYPES ============

export interface HttpExecutorInput {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  auth?: {
    type: "none" | "basic" | "api-key";
    username?: string;
    password?: string;
    key?: string;
    value?: string;
    location?: "header" | "query";
  };
}

export interface HttpExecutorOutput {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  duration: number;
}

export interface EmailExecutorInput {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyFormat: "richtext" | "markdown" | "plaintext";
}

export interface SmsExecutorInput {
  from: string;
  to: string;
  message: string;
}

export interface IfElseExecutorInput {
  conditions: Array<{
    field: string;
    operator: string;
    valueType: string;
    value: string;
    logicalOp?: "AND" | "OR";
  }>;
  context: Record<string, unknown>;
}

export interface DelayExecutorInput {
  delayValue: number;
  delayUnit: "seconds" | "minutes" | "hours" | "days";
}

// TransformExecutorInput is now defined in transformExecutor.ts
// to match the VariableMapping type from workflow.ts

