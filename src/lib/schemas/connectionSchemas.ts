import { z } from "zod";
import { PortDataType, ConditionalLabel } from "@/types/ports";
import { WorkflowNodeType } from "@/types/workflow";

// ============ PORT DATA TYPE SCHEMA ============

export const portDataTypeSchema = z.enum([
  PortDataType.STRING,
  PortDataType.NUMBER,
  PortDataType.BOOLEAN,
  PortDataType.JSON,
  PortDataType.ARRAY,
  PortDataType.BINARY,
  PortDataType.EMAIL_ADDRESS,
  PortDataType.PHONE_NUMBER,
  PortDataType.URL,
  PortDataType.HTTP_RESPONSE,
  PortDataType.ANY,
  PortDataType.TRIGGER_PAYLOAD,
]);

// ============ CONDITIONAL LABEL SCHEMA ============

export const conditionalLabelSchema = z.enum([
  ConditionalLabel.TRUE,
  ConditionalLabel.FALSE,
  ConditionalLabel.SUCCESS,
  ConditionalLabel.ERROR,
  ConditionalLabel.MATCH,
  ConditionalLabel.NO_MATCH,
  ConditionalLabel.CONTINUE,
  ConditionalLabel.BREAK,
  ConditionalLabel.COMPLETE,
]);

// ============ PORT DEFINITION SCHEMAS ============

export const inputPortSchema = z.object({
  id: z.string(),
  label: z.string(),
  dataType: portDataTypeSchema,
  description: z.string().optional(),
  required: z.boolean().optional(),
  acceptsTypes: z.array(portDataTypeSchema),
});

export const outputPortSchema = z.object({
  id: z.string(),
  label: z.string(),
  dataType: portDataTypeSchema,
  description: z.string().optional(),
});

// ============ CONNECTION VALIDATION SCHEMA ============

export const connectionSchema = z
  .object({
    sourceNodeId: z.string().min(1, "Source node is required"),
    targetNodeId: z.string().min(1, "Target node is required"),
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional(),
    sourceNodeType: z.nativeEnum(WorkflowNodeType),
    targetNodeType: z.nativeEnum(WorkflowNodeType),
    sourcePortType: portDataTypeSchema,
    targetPortType: portDataTypeSchema,
  })
  .superRefine((data, ctx) => {
    // Rule 1: Self-connection check
    if (data.sourceNodeId === data.targetNodeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A node cannot connect to itself",
        path: ["targetNodeId"],
      });
    }

    // Rule 2: Trigger-to-trigger connection check
    const sourceTrigger =
      data.sourceNodeType === WorkflowNodeType.TRIGGER_MANUAL ||
      data.sourceNodeType === WorkflowNodeType.TRIGGER_WEBHOOK;
    const targetTrigger =
      data.targetNodeType === WorkflowNodeType.TRIGGER_MANUAL ||
      data.targetNodeType === WorkflowNodeType.TRIGGER_WEBHOOK;

    if (sourceTrigger && targetTrigger) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Trigger nodes cannot be connected to each other",
        path: ["targetNodeType"],
      });
    }

    // Rule 3: Type compatibility check (simplified - full check in graphValidation)
    const typeCompatibility = checkTypeCompatibility(
      data.sourcePortType,
      data.targetPortType
    );
    if (!typeCompatibility.compatible) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: typeCompatibility.reason,
        path: ["targetPortType"],
      });
    }
  });

// ============ EDGE SCHEMA ============

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  animated: z.boolean().optional(),
  data: z
    .object({
      condition: conditionalLabelSchema.optional(),
      label: z.string().nullable().optional(),
    })
    .optional(),
  style: z
    .object({
      stroke: z.string().optional(),
      strokeWidth: z.number().optional(),
    })
    .optional(),
});

// ============ TYPE COMPATIBILITY HELPER ============

interface TypeCompatibilityResult {
  compatible: boolean;
  reason: string;
}

/**
 * Check if source port type can connect to target port type
 */
function checkTypeCompatibility(
  sourceType: PortDataType,
  targetType: PortDataType
): TypeCompatibilityResult {
  // ANY accepts everything
  if (targetType === PortDataType.ANY) {
    return { compatible: true, reason: "" };
  }

  // Define type hierarchy/compatibility
  const compatibilityMap: Record<PortDataType, PortDataType[]> = {
    [PortDataType.STRING]: [PortDataType.STRING, PortDataType.ANY],
    [PortDataType.NUMBER]: [
      PortDataType.NUMBER,
      PortDataType.STRING,
      PortDataType.ANY,
    ],
    [PortDataType.BOOLEAN]: [
      PortDataType.BOOLEAN,
      PortDataType.STRING,
      PortDataType.ANY,
    ],
    [PortDataType.JSON]: [PortDataType.JSON, PortDataType.STRING, PortDataType.ANY],
    [PortDataType.ARRAY]: [
      PortDataType.ARRAY,
      PortDataType.JSON,
      PortDataType.ANY,
    ],
    [PortDataType.BINARY]: [PortDataType.BINARY, PortDataType.ANY],
    [PortDataType.EMAIL_ADDRESS]: [
      PortDataType.EMAIL_ADDRESS,
      PortDataType.STRING,
      PortDataType.ANY,
    ],
    [PortDataType.PHONE_NUMBER]: [
      PortDataType.PHONE_NUMBER,
      PortDataType.STRING,
      PortDataType.ANY,
    ],
    [PortDataType.URL]: [PortDataType.URL, PortDataType.STRING, PortDataType.ANY],
    [PortDataType.HTTP_RESPONSE]: [
      PortDataType.HTTP_RESPONSE,
      PortDataType.JSON,
      PortDataType.ANY,
    ],
    [PortDataType.ANY]: Object.values(PortDataType),
    [PortDataType.TRIGGER_PAYLOAD]: [
      PortDataType.TRIGGER_PAYLOAD,
      PortDataType.JSON,
      PortDataType.ANY,
    ],
  };

  const compatibleTypes = compatibilityMap[sourceType];
  if (compatibleTypes?.includes(targetType)) {
    return { compatible: true, reason: "" };
  }

  return {
    compatible: false,
    reason: `Type mismatch: "${sourceType}" cannot connect to "${targetType}"`,
  };
}

// ============ CONDITIONAL NODE VALIDATION ============

/**
 * Schema for validating conditional node branch requirements
 */
export const conditionalBranchSchema = z
  .object({
    nodeId: z.string(),
    nodeType: z.nativeEnum(WorkflowNodeType),
    nodeLabel: z.string(),
    requiredBranches: z.array(z.string()),
    connectedBranches: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    // Check if all required branches are connected
    const missingBranches = data.requiredBranches.filter(
      (branch) => !data.connectedBranches.includes(branch)
    );

    if (missingBranches.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Missing required branch connections: ${missingBranches.join(", ")}`,
        path: ["connectedBranches"],
      });
    }
  });

// ============ TYPE EXPORTS ============

export type ConnectionInput = z.input<typeof connectionSchema>;
export type WorkflowEdgeInput = z.input<typeof workflowEdgeSchema>;
export type ConditionalBranchInput = z.input<typeof conditionalBranchSchema>;

