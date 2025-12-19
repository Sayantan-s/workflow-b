import { z } from "zod";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";
import { WorkflowNodeType } from "@/types/workflow";
import { NODE_PORT_SCHEMAS, hasConditionalOutputs } from "@/lib/portSchemas";
import { PortDataType } from "@/types/ports";

// ============ VALIDATION ERROR TYPES ============

export const validationErrorTypeSchema = z.enum([
  "cycle",
  "type_mismatch",
  "missing_label",
  "invalid_connection",
  "orphan_branch",
  "invalid_node_data",
]);

export type ValidationErrorType = z.infer<typeof validationErrorTypeSchema>;

export const validationErrorSchema = z.object({
  type: validationErrorTypeSchema,
  message: z.string(),
  nodeIds: z.array(z.string()).optional(),
  edgeId: z.string().optional(),
  severity: z.enum(["error", "warning"]),
  zodErrors: z.array(z.any()).optional(), // Original Zod issues for detailed info
});

export type ValidationError = z.infer<typeof validationErrorSchema>;

export const validationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(validationErrorSchema),
  warnings: z.array(validationErrorSchema),
});

export type ValidationResult = z.infer<typeof validationResultSchema>;

// ============ GRAPH STRUCTURE SCHEMAS ============

/**
 * Schema for a single node in the graph
 */
export const graphNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.object({
    type: z.nativeEnum(WorkflowNodeType),
    label: z.string(),
  }).passthrough(),
});

/**
 * Schema for a single edge in the graph
 */
export const graphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

// ============ CYCLE DETECTION ============

/**
 * Cycle detection result schema
 */
export const cycleInfoSchema = z.object({
  hasCycle: z.boolean(),
  cycleNodes: z.array(z.string()),
  cyclePath: z.array(z.string()),
});

export type CycleInfo = z.infer<typeof cycleInfoSchema>;

/**
 * Detect cycles using DFS with node coloring
 */
export function detectCycles(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): CycleInfo {
  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  nodes.forEach((node) => adjacency.set(node.id, []));
  edges.forEach((edge) => {
    const targets = adjacency.get(edge.source) || [];
    targets.push(edge.target);
    adjacency.set(edge.source, targets);
  });

  // Color states: 0 = white (unvisited), 1 = gray (visiting), 2 = black (done)
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();

  nodes.forEach((node) => {
    color.set(node.id, 0);
    parent.set(node.id, null);
  });

  let hasCycle = false;
  const cycleNodes: string[] = [];
  const cyclePath: string[] = [];

  function dfs(nodeId: string): boolean {
    color.set(nodeId, 1);

    for (const neighbor of adjacency.get(nodeId) || []) {
      const neighborColor = color.get(neighbor);

      if (neighborColor === 1) {
        // Back edge found - cycle detected
        hasCycle = true;

        // Reconstruct cycle path
        let current: string | null | undefined = nodeId;
        const path: string[] = [neighbor];

        while (current && current !== neighbor) {
          path.unshift(current);
          current = parent.get(current);
        }
        path.unshift(neighbor);

        cyclePath.push(...path);
        cycleNodes.push(...new Set(path));
        return true;
      }

      if (neighborColor === 0) {
        parent.set(neighbor, nodeId);
        if (dfs(neighbor)) return true;
      }
    }

    color.set(nodeId, 2);
    return false;
  }

  for (const node of nodes) {
    if (color.get(node.id) === 0 && dfs(node.id)) break;
  }

  // Validate result with Zod
  return cycleInfoSchema.parse({ hasCycle, cycleNodes, cyclePath });
}

/**
 * Check if adding an edge would create a cycle
 */
export function wouldCreateCycle(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  newSource: string,
  newTarget: string
): boolean {
  const adjacency = new Map<string, string[]>();
  nodes.forEach((node) => adjacency.set(node.id, []));
  edges.forEach((edge) => {
    const targets = adjacency.get(edge.source) || [];
    targets.push(edge.target);
    adjacency.set(edge.source, targets);
  });

  const visited = new Set<string>();

  function canReach(from: string, to: string): boolean {
    if (from === to) return true;
    if (visited.has(from)) return false;

    visited.add(from);
    for (const neighbor of adjacency.get(from) || []) {
      if (canReach(neighbor, to)) return true;
    }
    return false;
  }

  return canReach(newTarget, newSource);
}

// ============ CONNECTION VALIDATION SCHEMA ============

/**
 * Create a Zod schema for validating a specific connection
 */
export function createConnectionValidationSchema(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
) {
  return z
    .object({
      sourceId: z.string(),
      targetId: z.string(),
      sourceHandle: z.string().optional(),
      targetHandle: z.string().optional(),
    })
    .superRefine((connection, ctx) => {
      const { sourceId, targetId, sourceHandle, targetHandle } = connection;

      const sourceNode = nodes.find((n) => n.id === sourceId);
      const targetNode = nodes.find((n) => n.id === targetId);

      // Rule 1: Nodes must exist
      if (!sourceNode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Source node not found",
          path: ["sourceId"],
        });
        return;
      }

      if (!targetNode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Target node not found",
          path: ["targetId"],
        });
        return;
      }

      // Rule 2: No self-connections
      if (sourceId === targetId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A node cannot connect to itself",
          path: ["targetId"],
        });
      }

      // Rule 3: No trigger-to-trigger connections
      const sourceType = sourceNode.data.type;
      const targetType = targetNode.data.type;
      const isTriggerToTrigger =
        (sourceType === WorkflowNodeType.TRIGGER_MANUAL &&
          targetType === WorkflowNodeType.TRIGGER_WEBHOOK) ||
        (sourceType === WorkflowNodeType.TRIGGER_WEBHOOK &&
          targetType === WorkflowNodeType.TRIGGER_MANUAL);

      if (isTriggerToTrigger) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Trigger nodes cannot be connected to each other",
          path: ["targetId"],
        });
      }

      // Rule 4: No cycles
      if (wouldCreateCycle(nodes, edges, sourceId, targetId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "This connection would create a cycle in the workflow",
          path: ["targetId"],
        });
      }

      // Rule 5: Type compatibility
      const sourceSchema =
        NODE_PORT_SCHEMAS[sourceType as WorkflowNodeType];
      const targetSchema =
        NODE_PORT_SCHEMAS[targetType as WorkflowNodeType];

      if (sourceSchema && targetSchema) {
        const sourceHandleId = sourceHandle || "output";
        const targetHandleId = targetHandle || "input";

        const sourcePort = sourceSchema.outputs.find(
          (p) => p.id === sourceHandleId
        );
        const targetPort = targetSchema.inputs.find(
          (p) => p.id === targetHandleId
        );

        if (sourcePort && targetPort) {
          if (!isTypeCompatible(sourcePort.dataType, targetPort.dataType)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Type mismatch: "${sourcePort.dataType}" cannot connect to "${targetPort.dataType}"`,
              path: ["targetHandle"],
            });
          }
        }
      }

      // Rule 6: No duplicate connections
      const duplicateEdge = edges.find(
        (e) =>
          e.source === sourceId &&
          e.target === targetId &&
          e.sourceHandle === sourceHandle
      );

      if (duplicateEdge) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "This connection already exists",
          path: ["targetId"],
        });
      }
    });
}

// ============ TYPE COMPATIBILITY ============

function isTypeCompatible(
  sourceType: PortDataType,
  targetType: PortDataType
): boolean {
  if (targetType === PortDataType.ANY) return true;

  const compatibilityMap: Record<PortDataType, PortDataType[]> = {
    [PortDataType.STRING]: [PortDataType.STRING, PortDataType.ANY],
    [PortDataType.NUMBER]: [PortDataType.NUMBER, PortDataType.STRING, PortDataType.ANY],
    [PortDataType.BOOLEAN]: [PortDataType.BOOLEAN, PortDataType.STRING, PortDataType.ANY],
    [PortDataType.JSON]: [PortDataType.JSON, PortDataType.STRING, PortDataType.ANY],
    [PortDataType.ARRAY]: [PortDataType.ARRAY, PortDataType.JSON, PortDataType.ANY],
    [PortDataType.BINARY]: [PortDataType.BINARY, PortDataType.ANY],
    [PortDataType.EMAIL_ADDRESS]: [PortDataType.EMAIL_ADDRESS, PortDataType.STRING, PortDataType.ANY],
    [PortDataType.PHONE_NUMBER]: [PortDataType.PHONE_NUMBER, PortDataType.STRING, PortDataType.ANY],
    [PortDataType.URL]: [PortDataType.URL, PortDataType.STRING, PortDataType.ANY],
    [PortDataType.HTTP_RESPONSE]: [PortDataType.HTTP_RESPONSE, PortDataType.JSON, PortDataType.ANY],
    [PortDataType.ANY]: Object.values(PortDataType),
    [PortDataType.TRIGGER_PAYLOAD]: [PortDataType.TRIGGER_PAYLOAD, PortDataType.JSON, PortDataType.ANY],
  };

  return compatibilityMap[sourceType]?.includes(targetType) ?? false;
}

// ============ BRANCH VALIDATION ============

/**
 * Create validation schema for conditional branch requirements
 */
export function createBranchValidationSchema(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
) {
  return z
    .object({
      nodeId: z.string(),
    })
    .superRefine((data, ctx) => {
      const node = nodes.find((n) => n.id === data.nodeId);
      if (!node) return;

      const nodeType = node.data.type as WorkflowNodeType;
      if (!hasConditionalOutputs(nodeType)) return;

      const schema = NODE_PORT_SCHEMAS[nodeType];
      const requiredOutputs = schema.outputs.map((o) => o.id);

      const outgoingEdges = edges.filter((e) => e.source === data.nodeId);
      const usedHandles = new Set(
        outgoingEdges.map((e) => e.sourceHandle || "output")
      );

      const missingLabels = requiredOutputs.filter(
        (label) => !usedHandles.has(label)
      );

      if (missingLabels.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing required branch connections: ${missingLabels.join(", ")}`,
          path: ["nodeId"],
        });
      }
    });
}

// ============ FULL GRAPH VALIDATION ============

/**
 * Validate the entire workflow graph using Zod
 */
export function validateWorkflowGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 1. Cycle Detection
  const cycleInfo = detectCycles(nodes, edges);
  if (cycleInfo.hasCycle) {
    errors.push({
      type: "cycle",
      message: `Cycle detected: ${cycleInfo.cyclePath.join(" → ")}`,
      nodeIds: cycleInfo.cycleNodes,
      severity: "error",
    });
  }

  // 2. Port Type Validation
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) continue;

    const sourceSchema =
      NODE_PORT_SCHEMAS[sourceNode.data.type as WorkflowNodeType];
    const targetSchema =
      NODE_PORT_SCHEMAS[targetNode.data.type as WorkflowNodeType];

    if (!sourceSchema || !targetSchema) continue;

    const sourceHandleId = edge.sourceHandle || "output";
    const targetHandleId = edge.targetHandle || "input";

    const sourcePort = sourceSchema.outputs.find((p) => p.id === sourceHandleId);
    const targetPort = targetSchema.inputs.find((p) => p.id === targetHandleId);

    if (sourcePort && targetPort) {
      if (!isTypeCompatible(sourcePort.dataType, targetPort.dataType)) {
        errors.push({
          type: "type_mismatch",
          message: `Type mismatch on edge: "${sourcePort.dataType}" → "${targetPort.dataType}"`,
          nodeIds: [edge.source, edge.target],
          edgeId: edge.id,
          severity: "error",
        });
      }
    }
  }

  // 3. Conditional Branch Validation (warnings)
  for (const node of nodes) {
    const nodeType = node.data.type as WorkflowNodeType;
    if (!hasConditionalOutputs(nodeType)) continue;

    const schema = NODE_PORT_SCHEMAS[nodeType];
    const requiredOutputs = schema.outputs.map((o) => o.id);

    const outgoingEdges = edges.filter((e) => e.source === node.id);
    const usedHandles = new Set(
      outgoingEdges.map((e) => e.sourceHandle || "output")
    );

    const missingLabels = requiredOutputs.filter(
      (label) => !usedHandles.has(label)
    );

    if (missingLabels.length > 0) {
      warnings.push({
        type: "missing_label",
        message: `"${node.data.label}" missing branches: ${missingLabels.join(", ")}`,
        nodeIds: [node.id],
        severity: "warning",
      });
    }
  }

  // 4. Orphan Node Detection (warnings)
  const connectedNodes = new Set<string>();
  edges.forEach((e) => {
    connectedNodes.add(e.source);
    connectedNodes.add(e.target);
  });

  const orphanNodes = nodes.filter(
    (n) =>
      !connectedNodes.has(n.id) && !n.data.type.startsWith("trigger:")
  );

  for (const orphan of orphanNodes) {
    warnings.push({
      type: "orphan_branch",
      message: `"${orphan.data.label}" is not connected to any other node`,
      nodeIds: [orphan.id],
      severity: "warning",
    });
  }

  // Validate and return result
  return validationResultSchema.parse({
    isValid: errors.length === 0,
    errors,
    warnings,
  });
}

/**
 * Validate a new connection before adding it
 */
export function validateNewConnection(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  sourceId: string,
  targetId: string,
  sourceHandle?: string,
  targetHandle?: string
): { valid: boolean; errors: string[] } {
  const schema = createConnectionValidationSchema(nodes, edges);

  const result = schema.safeParse({
    sourceId,
    targetId,
    sourceHandle,
    targetHandle,
  });

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errorMessages = result.error.issues.map((issue) => issue.message);
  return { valid: false, errors: errorMessages };
}

