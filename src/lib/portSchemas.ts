import { WorkflowNodeType } from "@/types/workflow";
import {
  type NodePortSchema,
  PortDataType,
  ConditionalLabel,
} from "@/types/ports";

/**
 * Port schemas for each node type
 * Defines what data each node accepts and produces
 */
export const NODE_PORT_SCHEMAS: Record<WorkflowNodeType, NodePortSchema> = {
  // ============ TRIGGER NODES ============
  // Triggers have no inputs, only outputs
  
  [WorkflowNodeType.TRIGGER_MANUAL]: {
    inputs: [],
    outputs: [
      {
        id: "output",
        label: "Trigger Data",
        dataType: PortDataType.TRIGGER_PAYLOAD,
        description: "Data passed when workflow is manually triggered",
      },
    ],
    isConditional: false,
  },

  [WorkflowNodeType.TRIGGER_WEBHOOK]: {
    inputs: [],
    outputs: [
      {
        id: "output",
        label: "Webhook Payload",
        dataType: PortDataType.JSON,
        description: "The HTTP request body and headers",
      },
    ],
    isConditional: false,
  },

  // ============ ACTION NODES ============

  [WorkflowNodeType.ACTION_HTTP]: {
    inputs: [
      {
        id: "input",
        label: "Request Data",
        dataType: PortDataType.ANY,
        acceptsTypes: [PortDataType.JSON, PortDataType.STRING, PortDataType.ANY],
        description: "Data to include in the request body",
        required: false,
      },
    ],
    outputs: [
      {
        id: ConditionalLabel.SUCCESS,
        label: "Success",
        dataType: PortDataType.HTTP_RESPONSE,
        description: "Response data on successful request (2xx status)",
      },
      {
        id: ConditionalLabel.ERROR,
        label: "Error",
        dataType: PortDataType.HTTP_RESPONSE,
        description: "Error data on failed request (non-2xx or network error)",
      },
    ],
    isConditional: true, // Has Success/Error branches
  },

  [WorkflowNodeType.ACTION_EMAIL]: {
    inputs: [
      {
        id: "input",
        label: "Email Data",
        dataType: PortDataType.ANY,
        acceptsTypes: [PortDataType.JSON, PortDataType.STRING, PortDataType.ANY],
        description: "Data for dynamic email content",
        required: false,
      },
    ],
    outputs: [
      {
        id: "output",
        label: "Result",
        dataType: PortDataType.JSON,
        description: "Email send result (message ID, status)",
      },
    ],
    isConditional: false,
  },

  [WorkflowNodeType.ACTION_SMS]: {
    inputs: [
      {
        id: "input",
        label: "SMS Data",
        dataType: PortDataType.ANY,
        acceptsTypes: [PortDataType.JSON, PortDataType.STRING, PortDataType.ANY],
        description: "Data for dynamic SMS content",
        required: false,
      },
    ],
    outputs: [
      {
        id: "output",
        label: "Result",
        dataType: PortDataType.JSON,
        description: "SMS send result",
      },
    ],
    isConditional: false,
  },

  // ============ LOGIC NODES ============

  [WorkflowNodeType.LOGIC_IF_ELSE]: {
    inputs: [
      {
        id: "input",
        label: "Condition Data",
        dataType: PortDataType.ANY,
        acceptsTypes: Object.values(PortDataType),
        description: "Data to evaluate against conditions",
        required: true,
      },
    ],
    outputs: [
      {
        id: ConditionalLabel.TRUE,
        label: "True",
        dataType: PortDataType.ANY,
        description: "Path when condition evaluates to true",
      },
      {
        id: ConditionalLabel.FALSE,
        label: "False",
        dataType: PortDataType.ANY,
        description: "Path when condition evaluates to false",
      },
    ],
    isConditional: true, // Has True/False branches
  },

  [WorkflowNodeType.LOGIC_DELAY]: {
    inputs: [
      {
        id: "input",
        label: "Input Data",
        dataType: PortDataType.ANY,
        acceptsTypes: Object.values(PortDataType),
        description: "Data to pass through after delay",
        required: true,
      },
    ],
    outputs: [
      {
        id: "output",
        label: "Output",
        dataType: PortDataType.ANY,
        description: "Same data passed through after delay",
      },
    ],
    isConditional: false,
  },

  [WorkflowNodeType.LOGIC_TRANSFORM]: {
    inputs: [
      {
        id: "input",
        label: "Source Data",
        dataType: PortDataType.ANY,
        acceptsTypes: Object.values(PortDataType),
        description: "Data to extract values from",
        required: true,
      },
    ],
    outputs: [
      {
        id: "output",
        label: "Mapped Variables",
        dataType: PortDataType.JSON,
        description: "Object containing extracted variables",
      },
    ],
    isConditional: false,
  },
};

/**
 * Get port schema for a node type
 */
export function getNodePortSchema(nodeType: WorkflowNodeType): NodePortSchema {
  return NODE_PORT_SCHEMAS[nodeType];
}

/**
 * Check if a node type has conditional (labeled) outputs
 */
export function hasConditionalOutputs(nodeType: WorkflowNodeType): boolean {
  return NODE_PORT_SCHEMAS[nodeType]?.isConditional ?? false;
}

/**
 * Get output labels for conditional nodes
 */
export function getConditionalLabels(nodeType: WorkflowNodeType): string[] {
  const schema = NODE_PORT_SCHEMAS[nodeType];
  if (!schema?.isConditional) return [];
  return schema.outputs.map((o) => o.label);
}

