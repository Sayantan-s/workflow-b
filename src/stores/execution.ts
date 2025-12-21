import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useWorkflowStore } from "./workflow";
import {
  WorkflowNodeType,
  type WorkflowNode,
  type HttpActionData,
  type WebhookTriggerData,
  type EmailActionData,
  type SmsActionData,
  type IfElseLogicData,
  type DelayLogicData,
  type TransformLogicData,
} from "@/types/workflow";
import type {
  ExecutionStatus,
  ExecutionResult,
  WorkflowExecutionContext,
  ExecutionOptions,
} from "@/types/execution";
import {
  executeHttp,
  executeWebhook,
  executeEmail,
  executeSms,
  executeDelay,
  executeIfElse,
  executeTransform,
} from "@/lib/executors";

export const useWorkflowExecution = defineStore("workflowExecution", () => {
  const workflowStore = useWorkflowStore();

  // ============ STATE ============

  // Execution status for each node
  const nodeExecutionStatus = ref<Record<string, ExecutionStatus>>({});

  // Execution results for each node
  const nodeResults = ref<Record<string, ExecutionResult>>({});

  // Overall workflow execution state
  const isExecuting = ref(false);
  const currentExecutingNodeId = ref<string | null>(null);

  // Execution context (shared data between nodes)
  const executionContext = ref<WorkflowExecutionContext>({
    nodeResults: {},
    variables: {},
    executionPath: [],
    errors: [],
  });

  // Execution log for debugging
  const executionLog = ref<
    Array<{
      timestamp: string;
      nodeId: string;
      message: string;
      type: "info" | "success" | "error" | "warning";
    }>
  >([]);

  // ============ GETTERS ============

  const getNodeStatus = computed(() => (nodeId: string): ExecutionStatus => {
    return nodeExecutionStatus.value[nodeId] || "idle";
  });

  const getNodeResult = computed(
    () =>
      (nodeId: string): ExecutionResult | undefined => {
        return nodeResults.value[nodeId];
      }
  );

  const hasNodeOutput = computed(() => (nodeId: string): boolean => {
    return !!nodeResults.value[nodeId]?.output;
  });

  const executionErrors = computed(() => executionContext.value.errors);

  const executionPathNodes = computed(
    () => executionContext.value.executionPath
  );

  // ============ HELPERS ============

  /**
   * Add a log entry
   */
  function addLog(
    nodeId: string,
    message: string,
    type: "info" | "success" | "error" | "warning" = "info"
  ) {
    executionLog.value.push({
      timestamp: new Date().toISOString(),
      nodeId,
      message,
      type,
    });
  }

  /**
   * Get topologically sorted nodes for execution
   * Returns nodes in dependency order (upstream nodes first)
   */
  function getTopologicalOrder(): string[] {
    const nodes = workflowStore.nodes;
    const edges = workflowStore.edges;

    // Build adjacency list and in-degree map
    const adjacency: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};

    // Initialize
    nodes.forEach((node) => {
      adjacency[node.id] = [];
      inDegree[node.id] = 0;
    });

    // Build graph
    edges.forEach((edge) => {
      const sourceAdj = adjacency[edge.source];
      if (sourceAdj) {
        sourceAdj.push(edge.target);
        const currentDegree = inDegree[edge.target] ?? 0;
        inDegree[edge.target] = currentDegree + 1;
      }
    });

    // Kahn's algorithm
    const queue: string[] = [];
    const result: string[] = [];

    // Start with nodes that have no incoming edges (triggers)
    Object.keys(inDegree).forEach((nodeId) => {
      const degree = inDegree[nodeId];
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const neighbors = adjacency[current];
      if (neighbors) {
        neighbors.forEach((neighbor) => {
          const currentDegree = inDegree[neighbor] ?? 0;
          inDegree[neighbor] = currentDegree - 1;
          if (inDegree[neighbor] === 0) {
            queue.push(neighbor);
          }
        });
      }
    }

    return result;
  }

  /**
   * Get upstream nodes (nodes that need to execute before this one)
   */
  function getUpstreamNodes(nodeId: string): string[] {
    const edges = workflowStore.edges;
    const upstream: string[] = [];

    // Find all edges pointing to this node
    edges.forEach((edge) => {
      if (edge.target === nodeId) {
        upstream.push(edge.source);
      }
    });

    return upstream;
  }

  /**
   * Get downstream nodes (nodes that execute after this one)
   */
  function getDownstreamNodes(nodeId: string, sourceHandle?: string): string[] {
    const edges = workflowStore.edges;
    const downstream: string[] = [];

    edges.forEach((edge) => {
      if (edge.source === nodeId) {
        // If sourceHandle is specified, only include edges from that handle
        if (sourceHandle === undefined || edge.sourceHandle === sourceHandle) {
          downstream.push(edge.target);
        }
      }
    });

    return downstream;
  }

  /**
   * Resolve template variables in a string
   * Replaces {{ $node.nodeId.output.path }} with actual values
   */
  function resolveVariables(template: string): string {
    if (!template) return template;

    return template.replace(
      /\{\{\s*\$node\.(\w+)\.([^}]+)\s*\}\}/g,
      (match, nodeId, path) => {
        const nodeOutput = executionContext.value.nodeResults[nodeId];
        if (!nodeOutput) return match;

        // Navigate the path
        const parts = path.split(".");
        let value: unknown = nodeOutput;

        for (const part of parts) {
          if (value === null || value === undefined) return match;
          if (typeof value === "object") {
            value = (value as Record<string, unknown>)[part];
          } else {
            return match;
          }
        }

        return String(value ?? match);
      }
    );
  }

  /**
   * Build context object from all previous node outputs
   */
  function buildContext(): Record<string, unknown> {
    const context: Record<string, unknown> = {
      ...executionContext.value.variables,
    };

    // Add all node outputs under $node namespace
    Object.entries(executionContext.value.nodeResults).forEach(
      ([nodeId, output]) => {
        context[`$node_${nodeId}`] = output;
      }
    );

    return context;
  }

  // ============ NODE EXECUTORS ============

  /**
   * Execute a single node
   */
  async function executeNode(node: WorkflowNode): Promise<ExecutionResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    // Ensure node has data
    if (!node.data) {
      return {
        status: "error",
        error: "Node data is missing",
        startedAt,
        completedAt: new Date().toISOString(),
        duration: 0,
      };
    }

    try {
      let output: unknown;

      switch (node.data.type) {
        case WorkflowNodeType.TRIGGER_MANUAL: {
          // Manual trigger just passes through
          output = { triggered: true, timestamp: startedAt };
          break;
        }

        case WorkflowNodeType.TRIGGER_WEBHOOK: {
          const data = node.data as WebhookTriggerData;

          // Validate required inputs
          const webhookUrl = resolveVariables(data.webhookUrl);
          if (!webhookUrl || webhookUrl.trim() === "") {
            throw new Error("Webhook URL is required");
          }

          // Validate URL format
          try {
            new URL(webhookUrl);
          } catch {
            throw new Error(`Invalid webhook URL: "${webhookUrl}"`);
          }

          if (!data.method) {
            throw new Error("HTTP method is required");
          }

          output = await executeWebhook({
            url: webhookUrl,
            method: data.method,
            timeout: 30,
            auth: data.auth,
          });
          break;
        }

        case WorkflowNodeType.ACTION_HTTP: {
          const data = node.data as HttpActionData;

          // Validate required inputs
          const url = resolveVariables(data.url);
          if (!url || url.trim() === "") {
            throw new Error("HTTP URL is required");
          }

          // Validate URL format
          try {
            new URL(url);
          } catch {
            throw new Error(`Invalid URL format: "${url}"`);
          }

          if (!data.method) {
            throw new Error("HTTP method is required");
          }

          // Parse body if provided
          let parsedBody: unknown;
          if (data.body && data.body.trim() !== "") {
            try {
              parsedBody = JSON.parse(resolveVariables(data.body));
            } catch {
              throw new Error("Invalid JSON body format");
            }
          }

          output = await executeHttp({
            url,
            method: data.method,
            body: parsedBody,
            timeout: data.timeout || 30,
            auth: data.auth,
          });
          break;
        }

        case WorkflowNodeType.ACTION_EMAIL: {
          const data = node.data as EmailActionData;
          output = await executeEmail({
            from: "noreply@workflow.app",
            to: data.recipients.to,
            cc: data.recipients.cc,
            bcc: data.recipients.bcc,
            subject: resolveVariables(data.subject),
            body: resolveVariables(data.body),
            bodyFormat: data.bodyFormat,
          });
          break;
        }

        case WorkflowNodeType.ACTION_SMS: {
          const data = node.data as SmsActionData;
          output = await executeSms({
            from: data.fromNumber,
            to: data.toNumber,
            message: resolveVariables(data.message),
          });
          break;
        }

        case WorkflowNodeType.LOGIC_IF_ELSE: {
          const data = node.data as IfElseLogicData;
          output = await executeIfElse({
            conditions: data.conditions,
            context: buildContext(),
          });
          break;
        }

        case WorkflowNodeType.LOGIC_DELAY: {
          const data = node.data as DelayLogicData;
          output = await executeDelay({
            delayValue: data.delayValue,
            delayUnit: data.delayUnit,
          });
          break;
        }

        case WorkflowNodeType.LOGIC_TRANSFORM: {
          const data = node.data as TransformLogicData;
          // Get the last executed upstream node's output
          const upstreamNodes = getUpstreamNodes(node.id);
          const firstUpstreamId = upstreamNodes[0];
          const lastUpstreamOutput = firstUpstreamId
            ? executionContext.value.nodeResults[firstUpstreamId] ?? {}
            : {};

          const result = await executeTransform({
            mappings: data.mappings,
            sourceData: lastUpstreamOutput,
          });

          // Store variables in context
          Object.assign(executionContext.value.variables, result.variables);
          output = result;
          break;
        }

        default:
          throw new Error(
            `Unknown node type: ${(node.data as { type: string }).type}`
          );
      }

      const completedAt = new Date().toISOString();
      const duration = Date.now() - startTime;

      return {
        status: "success",
        output,
        startedAt,
        completedAt,
        duration,
      };
    } catch (error) {
      const completedAt = new Date().toISOString();
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      return {
        status: "error",
        error: errorMessage,
        startedAt,
        completedAt,
        duration,
      };
    }
  }

  // ============ ACTIONS ============

  /**
   * Run a single node (with dependency resolution)
   */
  async function runNode(nodeId: string): Promise<ExecutionResult> {
    const node = workflowStore.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Check upstream dependencies
    const upstreamNodes = getUpstreamNodes(nodeId);
    for (const upstreamId of upstreamNodes) {
      if (!hasNodeOutput.value(upstreamId)) {
        // Recursively execute upstream node first
        addLog(
          nodeId,
          `Waiting for upstream node ${upstreamId} to complete`,
          "info"
        );
        await runNode(upstreamId);
      }
    }

    // Set status to running
    nodeExecutionStatus.value[nodeId] = "running";
    currentExecutingNodeId.value = nodeId;
    addLog(nodeId, `Starting execution`, "info");

    // Execute the node
    const result = await executeNode(node);

    // Update status and results
    nodeExecutionStatus.value[nodeId] = result.status;
    nodeResults.value[nodeId] = result;

    if (result.status === "success") {
      executionContext.value.nodeResults[nodeId] = result.output;
      executionContext.value.executionPath.push(nodeId);
      addLog(
        nodeId,
        `Completed successfully (${result.duration}ms)`,
        "success"
      );
    } else {
      executionContext.value.errors.push({
        nodeId,
        message: result.error || "Unknown error",
      });
      addLog(nodeId, `Failed: ${result.error}`, "error");
    }

    currentExecutingNodeId.value = null;
    return result;
  }

  /**
   * Execute the entire workflow starting from trigger nodes
   */
  async function executeWorkflow(options?: ExecutionOptions): Promise<void> {
    if (isExecuting.value) {
      throw new Error("Workflow is already executing");
    }

    // Reset state
    resetExecution();
    isExecuting.value = true;
    addLog("system", "Starting workflow execution", "info");

    try {
      const nodes = workflowStore.nodes;
      const edges = workflowStore.edges;

      // Find start node(s)
      let startNodes: WorkflowNode[];

      if (options?.startNodeId) {
        const startNode = nodes.find((n) => n.id === options.startNodeId);
        if (!startNode) {
          throw new Error(`Start node ${options.startNodeId} not found`);
        }
        startNodes = [startNode];
      } else {
        // Find trigger nodes (nodes with no incoming edges)
        const nodesWithIncoming = new Set(edges.map((e) => e.target));
        startNodes = nodes.filter((n) => !nodesWithIncoming.has(n.id));

        // If no orphan nodes, look for trigger types
        if (startNodes.length === 0) {
          startNodes = nodes.filter(
            (n) =>
              n.data?.type === WorkflowNodeType.TRIGGER_MANUAL ||
              n.data?.type === WorkflowNodeType.TRIGGER_WEBHOOK
          );
        }
      }

      if (startNodes.length === 0) {
        throw new Error("No start nodes found in workflow");
      }

      // Execute workflow using BFS from start nodes
      const visited = new Set<string>();
      const queue: string[] = startNodes.map((n) => n.id);

      while (queue.length > 0) {
        const currentId = queue.shift()!;

        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const node = nodes.find((n) => n.id === currentId);
        if (!node) continue;

        // Execute the current node
        const result = await runNode(currentId);

        // If execution failed, stop (unless it's a branch node)
        if (
          result.status === "error" &&
          node.data?.type !== WorkflowNodeType.LOGIC_IF_ELSE
        ) {
          addLog(currentId, "Workflow stopped due to error", "error");
          break;
        }

        // Get downstream nodes
        let downstreamNodes: string[];

        // Special handling for IF/ELSE - only follow the correct branch
        if (node.data?.type === WorkflowNodeType.LOGIC_IF_ELSE) {
          const ifElseResult = result.output as { branch: "true" | "false" };
          const branch = ifElseResult?.branch || "true";

          // Find the edge with the matching handle
          const branchHandle = `source__${branch}`;
          downstreamNodes = getDownstreamNodes(currentId, branchHandle);

          // Mark the other branch as skipped
          const otherBranch = branch === "true" ? "false" : "true";
          const otherHandle = `source__${otherBranch}`;
          const skippedNodes = getDownstreamNodes(currentId, otherHandle);

          skippedNodes.forEach((skippedId) => {
            nodeExecutionStatus.value[skippedId] = "skipped";
            addLog(skippedId, `Skipped (branch: ${otherBranch})`, "warning");
          });
        } else {
          downstreamNodes = getDownstreamNodes(currentId);
        }

        // Add downstream nodes to queue
        downstreamNodes.forEach((id) => {
          if (!visited.has(id)) {
            queue.push(id);
          }
        });
      }

      addLog("system", "Workflow execution completed", "success");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      addLog("system", `Workflow execution failed: ${errorMessage}`, "error");
      throw error;
    } finally {
      isExecuting.value = false;
      currentExecutingNodeId.value = null;
    }
  }

  /**
   * Reset all execution state
   */
  function resetExecution() {
    nodeExecutionStatus.value = {};
    nodeResults.value = {};
    currentExecutingNodeId.value = null;
    executionContext.value = {
      nodeResults: {},
      variables: {},
      executionPath: [],
      errors: [],
    };
    executionLog.value = [];

    // Reset all nodes to idle
    workflowStore.nodes.forEach((node) => {
      nodeExecutionStatus.value[node.id] = "idle";
    });
  }

  /**
   * Stop execution (if running)
   */
  function stopExecution() {
    if (isExecuting.value) {
      isExecuting.value = false;
      currentExecutingNodeId.value = null;
      addLog("system", "Workflow execution stopped by user", "warning");
    }
  }

  return {
    // State
    nodeExecutionStatus,
    nodeResults,
    isExecuting,
    currentExecutingNodeId,
    executionContext,
    executionLog,

    // Getters
    getNodeStatus,
    getNodeResult,
    hasNodeOutput,
    executionErrors,
    executionPathNodes,

    // Actions
    runNode,
    executeWorkflow,
    resetExecution,
    stopExecution,

    // Helpers (exposed for testing/debugging)
    getTopologicalOrder,
    getUpstreamNodes,
    getDownstreamNodes,
  };
});
