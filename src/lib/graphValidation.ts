/**
 * Graph Validation Module
 *
 * This module provides Zod-based validation for workflow graphs including:
 * 1. Acyclic graph (DAG) validation with cycle detection
 * 2. Typed ports with data type compatibility checking
 * 3. Required labels for conditional branches
 *
 * All validations are powered by Zod schemas for type-safe, declarative validation.
 */

// Re-export everything from Zod schemas for backwards compatibility
export {
  // Validation types and schemas
  type ValidationError,
  type ValidationResult,
  type CycleInfo,
  validationErrorSchema,
  validationResultSchema,
  cycleInfoSchema,
  // Core validation functions
  detectCycles,
  wouldCreateCycle,
  validateWorkflowGraph,
  validateNewConnection,
  // Schema creators for custom validation
  createConnectionValidationSchema,
  createBranchValidationSchema,
} from "./schemas/graphSchemas";

// Re-export connection validation schemas
export {
  connectionSchema,
  workflowEdgeSchema,
  conditionalBranchSchema,
  type ConnectionInput,
} from "./schemas/connectionSchemas";

// Import for local use
import type { WorkflowNode } from "@/types/workflow";
import { WorkflowNodeType } from "@/types/workflow";
import { ConditionalLabel, isTypeCompatible } from "@/types/ports";
import { NODE_PORT_SCHEMAS } from "./portSchemas";

// ============ EDGE LABEL HELPERS ============

/**
 * Get the display label for an edge based on source handle
 */
export function getEdgeLabel(
  sourceNode: WorkflowNode,
  sourceHandle?: string
): string | null {
  const nodeType = sourceNode?.data?.type as WorkflowNodeType;
  const schema = NODE_PORT_SCHEMAS[nodeType];

  if (!schema?.isConditional) return null;

  const handleId = sourceHandle || "output";
  const port = schema.outputs.find((p) => p.id === handleId);

  return port?.label || null;
}

/**
 * Get edge styling based on the branch type
 */
export function getEdgeStyle(sourceHandle?: string): {
  color: string;
  label: string | null;
} {
  switch (sourceHandle) {
    case ConditionalLabel.TRUE:
    case ConditionalLabel.SUCCESS:
      return {
        color: "#22c55e",
        label: sourceHandle === ConditionalLabel.TRUE ? "True" : "Success",
      };
    case ConditionalLabel.FALSE:
    case ConditionalLabel.ERROR:
      return {
        color: "#ef4444",
        label: sourceHandle === ConditionalLabel.FALSE ? "False" : "Error",
      };
    case ConditionalLabel.MATCH:
      return { color: "#3b82f6", label: "Match" };
    case ConditionalLabel.NO_MATCH:
      return { color: "#f59e0b", label: "No Match" };
    default:
      return { color: "#6366f1", label: null };
  }
}

/**
 * Check if a specific connection is type-compatible (simplified helper)
 */
export function isConnectionTypeValid(
  sourceNode: WorkflowNode,
  targetNode: WorkflowNode,
  sourceHandle?: string,
  targetHandle?: string
): { valid: boolean; reason?: string } {
  const sourceSchema =
    NODE_PORT_SCHEMAS[sourceNode?.data?.type as WorkflowNodeType];
  const targetSchema =
    NODE_PORT_SCHEMAS[targetNode?.data?.type as WorkflowNodeType];

  if (!sourceSchema || !targetSchema) {
    return { valid: true }; // Unknown schemas, allow connection
  }

  const sourceHandleId = sourceHandle || "output";
  const targetHandleId = targetHandle || "input";

  const sourcePort = sourceSchema.outputs.find((p) => p.id === sourceHandleId);
  const targetPort = targetSchema.inputs.find((p) => p.id === targetHandleId);

  if (!sourcePort) {
    return {
      valid: false,
      reason: `Source port "${sourceHandleId}" not found`,
    };
  }

  if (!targetPort) {
    return {
      valid: false,
      reason: `Target port "${targetHandleId}" not found`,
    };
  }

  if (!isTypeCompatible(sourcePort.dataType, targetPort.dataType)) {
    return {
      valid: false,
      reason: `Type mismatch: "${sourcePort.label}" (${sourcePort.dataType}) cannot connect to "${targetPort.label}" (${targetPort.dataType})`,
    };
  }

  return { valid: true };
}
