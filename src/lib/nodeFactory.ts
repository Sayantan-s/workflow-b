import {
  type NodeType,
  type WorkflowNodeData,
  WorkflowNodeType,
  WorkflowExecutionStatus,
} from "@/types/workflow";

/**
 * Creates default node data based on the node type
 */
export function createDefaultNodeData(type: NodeType): WorkflowNodeData {
  const base = {
    isValid: false,
    executionStatus: WorkflowExecutionStatus.IDLE,
  };

  switch (type) {
    case WorkflowNodeType.TRIGGER_MANUAL:
      return {
        ...base,
        type: WorkflowNodeType.TRIGGER_MANUAL,
        label: "Manual Trigger",
        description: "Click to run workflow",
        isValid: true, // Manual trigger is always valid
      };

    case WorkflowNodeType.TRIGGER_WEBHOOK:
      return {
        ...base,
        type: WorkflowNodeType.TRIGGER_WEBHOOK,
        label: "Webhook",
        webhookUrl: "",
        method: "POST",
        auth: { type: "none" },
      };

    case WorkflowNodeType.ACTION_HTTP:
      return {
        ...base,
        type: WorkflowNodeType.ACTION_HTTP,
        label: "HTTP Request",
        url: "",
        method: "GET",
        auth: { type: "none" },
        bodyType: "json",
        body: "",
        timeout: 30,
      };

    case WorkflowNodeType.ACTION_EMAIL:
      return {
        ...base,
        type: WorkflowNodeType.ACTION_EMAIL,
        label: "Send Email",
        recipients: { to: [], cc: [], bcc: [] },
        subject: "",
        body: "",
        bodyFormat: "plaintext",
        attachments: [],
      };

    case WorkflowNodeType.ACTION_SMS:
      return {
        ...base,
        type: WorkflowNodeType.ACTION_SMS,
        label: "Send SMS",
        toNumber: "",
        message: "",
      };

    case WorkflowNodeType.LOGIC_IF_ELSE:
      return {
        ...base,
        type: WorkflowNodeType.LOGIC_IF_ELSE,
        label: "If/Else",
        conditions: [{ field: "", operator: "equals", value: "" }],
      };

    case WorkflowNodeType.LOGIC_DELAY:
      return {
        ...base,
        type: WorkflowNodeType.LOGIC_DELAY,
        label: "Delay",
        delayType: "hours",
        delayValue: 1,
        isValid: true, // Delay with default values is valid
      };

    case WorkflowNodeType.LOGIC_TRANSFORM:
      return {
        ...base,
        type: WorkflowNodeType.LOGIC_TRANSFORM,
        label: "Transform",
        description: "Extract and map data to variables",
        mappings: [],
      };

    default:
      throw new Error(`Unknown node type: ${type}`);
  }
}

/**
 * Maps our internal node types to Vue Flow custom node type names
 */
export function getVueFlowNodeType(type: NodeType): string {
  const mapping: Record<WorkflowNodeType, string> = {
    [WorkflowNodeType.TRIGGER_MANUAL]: "triggerManual",
    [WorkflowNodeType.TRIGGER_WEBHOOK]: "triggerWebhook",
    [WorkflowNodeType.ACTION_HTTP]: "actionHttp",
    [WorkflowNodeType.ACTION_EMAIL]: "actionEmail",
    [WorkflowNodeType.ACTION_SMS]: "actionSms",
    [WorkflowNodeType.LOGIC_IF_ELSE]: "logicIfElse",
    [WorkflowNodeType.LOGIC_DELAY]: "logicDelay",
    [WorkflowNodeType.LOGIC_TRANSFORM]: "logicTransform",
  };
  return mapping[type];
}

/**
 * Generates a unique node ID
 */
export function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a unique edge ID from source and target
 */
export function generateEdgeId(
  source: string,
  target: string,
  sourceHandle?: string
): string {
  const handleSuffix = sourceHandle ? `_${sourceHandle}` : "";
  return `e_${source}${handleSuffix}->${target}`;
}
