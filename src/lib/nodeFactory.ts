import type { NodeType, WorkflowNodeData } from "@/types/workflow";

/**
 * Creates default node data based on the node type
 */
export function createDefaultNodeData(type: NodeType): WorkflowNodeData {
  const base = {
    isValid: false,
    executionStatus: "idle" as const,
  };

  switch (type) {
    case "trigger:manual":
      return {
        ...base,
        type: "trigger:manual",
        label: "Manual Trigger",
        description: "Click to run workflow",
        isValid: true, // Manual trigger is always valid
      };

    case "trigger:webhook":
      return {
        ...base,
        type: "trigger:webhook",
        label: "Webhook",
        webhookUrl: "",
        method: "POST",
        auth: { type: "none" },
      };

    case "action:http":
      return {
        ...base,
        type: "action:http",
        label: "HTTP Request",
        url: "",
        method: "GET",
        auth: { type: "none" },
        bodyType: "json",
        body: "",
        timeout: 30,
      };

    case "action:email":
      return {
        ...base,
        type: "action:email",
        label: "Send Email",
        recipients: { to: [], cc: [], bcc: [] },
        subject: "",
        body: "",
        bodyFormat: "plaintext",
        attachments: [],
      };

    case "action:sms":
      return {
        ...base,
        type: "action:sms",
        label: "Send SMS",
        toNumber: "",
        message: "",
      };

    case "logic:if-else":
      return {
        ...base,
        type: "logic:if-else",
        label: "If/Else",
        conditions: [{ field: "", operator: "equals", value: "" }],
      };

    case "logic:delay":
      return {
        ...base,
        type: "logic:delay",
        label: "Delay",
        delayType: "hours",
        delayValue: 1,
        isValid: true, // Delay with default values is valid
      };

    default:
      throw new Error(`Unknown node type: ${type}`);
  }
}

/**
 * Maps our internal node types to Vue Flow custom node type names
 */
export function getVueFlowNodeType(type: NodeType): string {
  const mapping: Record<NodeType, string> = {
    "trigger:manual": "triggerManual",
    "trigger:webhook": "triggerWebhook",
    "action:http": "actionHttp",
    "action:email": "actionEmail",
    "action:sms": "actionSms",
    "logic:if-else": "logicIfElse",
    "logic:delay": "logicDelay",
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
