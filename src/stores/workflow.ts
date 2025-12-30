import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import type { Edge } from "@vue-flow/core";
import {
  type NodeType,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowNodeData,
  WorkflowNodeType,
  WorkflowExecutionStatus,
} from "@/types/workflow";
import {
  createDefaultNodeData,
  getVueFlowNodeType,
  generateNodeId,
  generateEdgeId,
} from "@/lib/nodeFactory";
import {
  validateWorkflowGraph,
  validateNewConnection,
  type ValidationResult,
} from "@/lib/graphValidation";
import { getEdgeStyle } from "@/lib/graphValidation";
import { validateNodeData, getNodeSchema } from "@/lib/schemas";
import { useWorkflowHistory } from "@/composables/useWorkflowHistory";
import type { WorkflowTemplate } from "@/lib/workflowTemplates";

const STORAGE_KEY = "workflow-state";

export const useWorkflowStore = defineStore("workflow", () => {
  // ============ STATE ============
  const nodes = ref<WorkflowNode[]>([]);
  const edges = ref<WorkflowEdge[]>([]);

  // Selection state
  const selectedNodeIds = ref<Set<string>>(new Set());
  const activeNodeId = ref<string | null>(null);

  // UI state
  const isDragging = ref(false);
  const draggedNodeType = ref<NodeType | null>(null);

  // Palette drawer state
  const isPaletteOpen = ref(false);
  const pendingEdgeConnection = ref<{
    sourceNodeId: string;
    sourceHandle?: string;
    position: { x: number; y: number };
  } | null>(null);

  // Validation state
  const validationResult = ref<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
  });

  // ============ HISTORY (UNDO/REDO) ============
  const history = useWorkflowHistory();

  const canUndo = computed(() => history.canUndo.value);
  const canRedo = computed(() => history.canRedo.value);

  function undo() {
    const snapshot = history.undo(nodes.value, edges.value);
    if (snapshot) {
      nodes.value = snapshot.nodes;
      edges.value = snapshot.edges;
    }
  }

  function redo() {
    const snapshot = history.redo(nodes.value, edges.value);
    if (snapshot) {
      nodes.value = snapshot.nodes;
      edges.value = snapshot.edges;
    }
  }

  function recordSnapshot() {
    history.takeSnapshot(nodes.value, edges.value);
  }

  function recordSnapshotDebounced() {
    history.takeSnapshotDebounced(nodes.value, edges.value);
  }

  // ============ GETTERS ============
  const activeNode = computed(
    () => nodes.value.find((n) => n.id === activeNodeId.value) ?? null
  );

  const selectedNodes = computed(() =>
    nodes.value.filter((n) => selectedNodeIds.value.has(n.id))
  );

  const nodesByCategory = computed(() => ({
    triggers: nodes.value.filter((n) => n?.data?.type?.startsWith("trigger:")),
    actions: nodes.value.filter((n) => n?.data?.type?.startsWith("action:")),
    logic: nodes.value.filter((n) => n?.data?.type?.startsWith("logic:")),
  }));

  const isWorkflowValid = computed(
    () => nodes.value.length > 0 && nodes.value.every((n) => n?.data?.isValid)
  );

  const hasTrigger = computed(() =>
    nodes.value.some((n) => n?.data?.type?.startsWith("trigger:"))
  );

  // Check if manual trigger already exists (Constraint: only one allowed)
  const hasManualTrigger = computed(() =>
    nodes.value.some((n) => n?.data?.type === WorkflowNodeType.TRIGGER_MANUAL)
  );

  // Check if webhook trigger exists
  const hasWebhookTrigger = computed(() =>
    nodes.value.some((n) => n?.data?.type === WorkflowNodeType.TRIGGER_WEBHOOK)
  );

  // Validation getters
  const graphErrors = computed(() => validationResult.value.errors);
  const graphWarnings = computed(() => validationResult.value.warnings);
  const isGraphValid = computed(() => validationResult.value.isValid);
  const hasCycle = computed(() =>
    validationResult.value.errors.some((e) => e.type === "cycle")
  );

  // Get nodes involved in validation errors
  const errorNodeIds = computed(() => {
    const ids = new Set<string>();
    validationResult.value.errors.forEach((error) => {
      error.nodeIds?.forEach((id) => ids.add(id));
    });
    return ids;
  });

  // Get edges involved in validation errors
  const errorEdgeIds = computed(() => {
    const ids = new Set<string>();
    validationResult.value.errors.forEach((error) => {
      if (error.edgeId) ids.add(error.edgeId);
    });
    return ids;
  });

  // ============ NODE ACTIONS ============

  /**
   * Check if a node type can be added based on constraints
   */
  function canAddNode(type: NodeType): { allowed: boolean; reason?: string } {
    // Constraint 1: Only one manual trigger node is allowed
    if (type === WorkflowNodeType.TRIGGER_MANUAL && hasManualTrigger.value) {
      return {
        allowed: false,
        reason: "Only one Manual Trigger node is allowed per workflow",
      };
    }

    return { allowed: true };
  }

  /**
   * Add a new node to the workflow
   */
  function addNode(
    type: NodeType,
    position: { x: number; y: number }
  ): WorkflowNode | null {
    // Check constraints before adding
    const validation = canAddNode(type);
    if (!validation.allowed) {
      console.warn(`Cannot add node: ${validation.reason}`);
      return null;
    }

    // Record snapshot before change
    recordSnapshot();

    const id = generateNodeId();
    const nodeData = createDefaultNodeData(type);

    const vueFlowType = getVueFlowNodeType(type);
    console.log(
      "[WorkflowStore] Creating node with type:",
      type,
      "->",
      vueFlowType
    );

    const newNode: WorkflowNode = {
      id,
      type: vueFlowType,
      position,
      data: nodeData,
    };

    console.log("[WorkflowStore] New node:", JSON.stringify(newNode, null, 2));

    nodes.value = [...nodes.value, newNode];
    console.log("[WorkflowStore] Total nodes after add:", nodes.value.length);
    setActiveNode(id);

    return newNode;
  }

  /**
   * Remove nodes by their IDs
   */
  function removeNodes(nodeIds: string[]) {
    if (nodeIds.length === 0) return;

    // Record snapshot before change
    recordSnapshot();

    nodes.value = nodes.value.filter((n) => !nodeIds.includes(n.id));

    // Also remove connected edges
    edges.value = edges.value.filter(
      (e: Edge) => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)
    ) as WorkflowEdge[];

    // Clear active node if it was removed
    if (activeNodeId.value && nodeIds.includes(activeNodeId.value)) {
      activeNodeId.value = null;
    }

    // Clear from selection
    nodeIds.forEach((id) => selectedNodeIds.value.delete(id));
  }

  /**
   * Duplicate selected nodes
   * Creates copies of selected nodes with new IDs and offset positions
   * If no nodes are selected, uses the active node
   */
  function duplicateNodes() {
    let selected = selectedNodes.value;

    // If no nodes are selected, try using the active node
    if (selected.length === 0 && activeNodeId.value) {
      const activeNode = nodes.value.find((n) => n.id === activeNodeId.value);
      if (activeNode) {
        selected = [activeNode];
        // Also select it
        selectNodes([activeNode.id]);
      }
    }

    console.log(
      "[WorkflowStore] duplicateNodes called, selected nodes:",
      selected.length
    );

    if (selected.length === 0) {
      console.warn("[WorkflowStore] No nodes selected for duplication");
      return;
    }

    // Record snapshot before change
    recordSnapshot();

    const offset = { x: 50, y: 50 }; // Offset for duplicated nodes
    const nodeIdMap = new Map<string, string>(); // Map old ID -> new ID

    // Create duplicated nodes
    const duplicatedNodes: WorkflowNode[] = selected.map((node) => {
      const newId = generateNodeId();
      nodeIdMap.set(node.id, newId);

      // Deep clone the data to avoid reference issues
      const duplicatedData: WorkflowNodeData = {
        ...(node.data as WorkflowNodeData),
        executionStatus: WorkflowExecutionStatus.IDLE,
      };

      const duplicatedNode: WorkflowNode = {
        ...node,
        id: newId,
        type: node.type, // Preserve VueFlow node type
        position: {
          x: node.position.x + offset.x,
          y: node.position.y + offset.y,
        },
        data: duplicatedData,
      };

      console.log(
        "[WorkflowStore] Duplicating node:",
        node.id,
        "->",
        newId,
        "Type:",
        node.type
      );
      return duplicatedNode;
    });

    console.log(
      "[WorkflowStore] Created",
      duplicatedNodes.length,
      "duplicated nodes"
    );

    // Add duplicated nodes - use array spread to ensure reactivity
    nodes.value = [...nodes.value, ...duplicatedNodes];
    console.log(
      "[WorkflowStore] Total nodes after duplication:",
      nodes.value.length
    );

    // Create duplicated edges (only between duplicated nodes)
    const duplicatedEdges: WorkflowEdge[] = [];
    edges.value.forEach((edge) => {
      const newSourceId = nodeIdMap.get(edge.source);
      const newTargetId = nodeIdMap.get(edge.target);

      // Only duplicate edges where both source and target were duplicated
      if (newSourceId && newTargetId) {
        duplicatedEdges.push({
          ...edge,
          id: generateEdgeId(
            newSourceId,
            newTargetId,
            edge.sourceHandle || undefined
          ),
          source: newSourceId,
          target: newTargetId,
        });
      }
    });

    if (duplicatedEdges.length > 0) {
      edges.value = [...edges.value, ...duplicatedEdges];
      console.log(
        "[WorkflowStore] Created",
        duplicatedEdges.length,
        "duplicated edges"
      );
    }

    // Select the duplicated nodes
    selectNodes(duplicatedNodes.map((n) => n.id));
    if (duplicatedNodes.length === 1 && duplicatedNodes[0]?.id) {
      setActiveNode(duplicatedNodes[0].id);
    }

    console.log("[WorkflowStore] Duplication complete");
  }

  /**
   * Validate node data using Zod schema
   */
  function validateNode(nodeId: string): {
    valid: boolean;
    errors: string[];
  } {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node) {
      return { valid: false, errors: ["Node not found"] };
    }

    const result = validateNodeData(node.data);
    if (result.success) {
      return { valid: true, errors: [] };
    }

    const errors = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    return { valid: false, errors };
  }

  /**
   * Update node data with optional Zod validation
   */
  function updateNodeData<T extends WorkflowNodeData>(
    nodeId: string,
    data: Partial<T>,
    options?: { validate?: boolean }
  ) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node) {
      const newData = { ...node.data, ...data } as WorkflowNodeData;

      // Optionally validate the updated data
      if (options?.validate) {
        const schema = getNodeSchema(newData.type);
        const result = schema.safeParse(newData);

        if (!result.success) {
          // Update isValid based on validation
          newData.isValid = false;
          console.warn(
            "Node data validation failed:",
            result.error.issues.map((i) => i.message)
          );
        } else {
          newData.isValid = true;
        }
      }

      node.data = newData;
    }
  }

  /**
   * Update node position
   */
  function updateNodePosition(
    nodeId: string,
    position: { x: number; y: number }
  ) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node) {
      node.position = position;
    }
  }

  // ============ VALIDATION ACTIONS ============

  /**
   * Run full graph validation
   */
  function runValidation() {
    validationResult.value = validateWorkflowGraph(nodes.value, edges.value);
  }

  // ============ EDGE ACTIONS ============

  /**
   * Check if a connection between two nodes is valid
   * Now includes: cycle detection, type compatibility, and domain rules
   */
  function canConnect(
    sourceId: string,
    targetId: string,
    sourceHandle?: string,
    targetHandle?: string
  ): { allowed: boolean; reason?: string; errors?: string[] } {
    const sourceNode = nodes.value.find((n) => n.id === sourceId);
    const targetNode = nodes.value.find((n) => n.id === targetId);

    if (!sourceNode || !targetNode) {
      return { allowed: false, reason: "Source or target node not found" };
    }

    const sourceType = sourceNode?.data?.type;
    const targetType = targetNode?.data?.type ?? "";

    if (!sourceType || !targetType) {
      return { allowed: false, reason: "Source or target node type not found" };
    }

    // Constraint: Manual trigger and webhook node cannot be connected directly
    const isTriggerToTrigger =
      (sourceType === WorkflowNodeType.TRIGGER_MANUAL &&
        targetType === WorkflowNodeType.TRIGGER_WEBHOOK) ||
      (sourceType === WorkflowNodeType.TRIGGER_WEBHOOK &&
        targetType === WorkflowNodeType.TRIGGER_MANUAL);

    if (isTriggerToTrigger) {
      return {
        allowed: false,
        reason: "Manual Trigger and Webhook cannot be connected directly",
      };
    }

    // Run comprehensive validation including cycle detection and type checking
    const validation = validateNewConnection(
      nodes.value,
      edges.value,
      sourceId,
      targetId,
      sourceHandle,
      targetHandle
    );

    if (!validation.valid) {
      return {
        allowed: false,
        reason: validation.errors[0],
        errors: validation.errors,
      };
    }

    return { allowed: true };
  }

  /**
   * Add a new edge with validation and conditional styling
   */
  function addEdge(
    source: string,
    target: string,
    sourceHandle?: string,
    targetHandle?: string
  ): WorkflowEdge | null {
    // Check connection constraints including cycle and type checks
    const validation = canConnect(source, target, sourceHandle, targetHandle);
    if (!validation.allowed) {
      console.warn(`Cannot connect nodes: ${validation.reason}`);
      return null;
    }

    const id = generateEdgeId(source, target, sourceHandle);

    // Check if edge already exists
    const existingEdge = edges.value.find((e: Edge) => e.id === id);
    if (existingEdge) {
      return existingEdge as WorkflowEdge;
    }

    // Record snapshot before change
    recordSnapshot();

    // Get edge styling for conditional branches
    const edgeStyle = getEdgeStyle(sourceHandle);

    const newEdge: WorkflowEdge = {
      id,
      source,
      target,
      sourceHandle,
      targetHandle,
      animated: true,
      style: { stroke: edgeStyle.color },
      data: {
        label: edgeStyle.label,
        condition: sourceHandle as "true" | "false" | undefined,
      },
    };

    edges.value = [...edges.value, newEdge];

    // Re-run validation after adding edge
    runValidation();

    return newEdge;
  }

  /**
   * Remove edges by their IDs
   */
  function removeEdges(edgeIds: string[]) {
    if (edgeIds.length === 0) return;

    // Record snapshot before change
    recordSnapshot();

    edges.value = edges.value.filter(
      (e: Edge) => !edgeIds.includes(e.id)
    ) as WorkflowEdge[];
  }

  // ============ SELECTION ACTIONS ============

  /**
   * Set the active node (for config panel)
   * Also selects the node if it's not null
   */
  function setActiveNode(nodeId: string | null) {
    activeNodeId.value = nodeId;
    // Also select the node when it becomes active
    if (nodeId) {
      selectNodes([nodeId]);
    }
  }

  /**
   * Select nodes
   */
  function selectNodes(nodeIds: string[], append = false) {
    if (!append) {
      selectedNodeIds.value.clear();
    }
    nodeIds.forEach((id) => selectedNodeIds.value.add(id));
  }

  /**
   * Select all nodes
   */
  function selectAll() {
    selectNodes(nodes.value.map((n) => n.id));
  }

  /**
   * Clear selection
   */
  function clearSelection() {
    selectedNodeIds.value.clear();
  }

  // ============ DRAG & DROP ACTIONS ============

  /**
   * Start dragging a node type from palette
   */
  function startDrag(type: NodeType) {
    isDragging.value = true;
    draggedNodeType.value = type;
  }

  /**
   * End dragging
   */
  function endDrag() {
    isDragging.value = false;
    draggedNodeType.value = null;
  }

  // ============ PALETTE DRAWER ACTIONS ============

  /**
   * Open palette drawer (optionally from an edge plus button)
   */
  function openPalette(edgeContext?: {
    sourceNodeId: string;
    sourceHandle?: string;
    position: { x: number; y: number };
  }) {
    isPaletteOpen.value = true;
    pendingEdgeConnection.value = edgeContext ?? null;
  }

  /**
   * Close palette drawer
   */
  function closePalette() {
    isPaletteOpen.value = false;
    pendingEdgeConnection.value = null;
  }

  /**
   * Add node from palette to a pending edge connection
   */
  function addNodeFromEdge(type: NodeType): WorkflowNode | null {
    if (!pendingEdgeConnection.value) return null;

    const { sourceNodeId, sourceHandle, position } =
      pendingEdgeConnection.value;

    // Add the new node at the position
    const newNode = addNode(type, position);
    if (!newNode) return null;

    // Connect the source to the new node
    addEdge(sourceNodeId, newNode.id, sourceHandle);

    // Close the palette
    closePalette();

    return newNode;
  }

  /**
   * Check if a node has outgoing edges from a specific handle
   */
  function hasOutgoingEdge(nodeId: string, handleId?: string): boolean {
    return edges.value.some(
      (e) =>
        e.source === nodeId && (handleId ? e.sourceHandle === handleId : true)
    );
  }

  /**
   * Get the end position for an edge (for plus button placement)
   */
  function getEdgeEndPosition(nodeId: string): { x: number; y: number } | null {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node) return null;

    // Calculate position to the right of the source node
    return {
      x: node.position.x + 300,
      y: node.position.y + 50,
    };
  }

  // ============ PERSISTENCE ============

  /**
   * Save workflow to localStorage
   */
  function saveToStorage() {
    const state = {
      nodes: nodes.value,
      edges: edges.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /**
   * Load workflow from localStorage
   */
  function loadFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    console.log(
      "[WorkflowStore] Loading from storage:",
      saved ? "found" : "empty"
    );
    if (saved) {
      try {
        const state = JSON.parse(saved);
        nodes.value = state.nodes || [];
        edges.value = state.edges || [];
        console.log("[WorkflowStore] Loaded nodes:", nodes.value.length);
        console.log(
          "[WorkflowStore] Node types:",
          nodes.value.map((n: WorkflowNode) => n.type)
        );
      } catch (e) {
        console.error("Failed to load workflow from storage:", e);
      }
    }
  }

  /**
   * Clear workflow
   */
  function clearWorkflow() {
    // Record snapshot before clearing
    recordSnapshot();

    nodes.value = [];
    edges.value = [];
    activeNodeId.value = null;
    selectedNodeIds.value.clear();
    localStorage.removeItem(STORAGE_KEY);

    // Clear history after clearing workflow
    history.clearHistory();
  }

  /**
   * Load a workflow template
   */
  function loadWorkflowTemplate(template: WorkflowTemplate) {
    // Record snapshot before loading
    recordSnapshot();

    // Clear current workflow
    nodes.value = [];
    edges.value = [];
    activeNodeId.value = null;
    selectedNodeIds.value.clear();

    // Deep clone nodes to avoid reference issues
    nodes.value = template.nodes.map((node) => ({
      ...node,
      data: { ...node.data } as WorkflowNodeData,
    })) as WorkflowNode[];

    // Add edges one by one using addEdge to ensure proper Vue Flow integration
    // This ensures edges are properly connected and validated
    template.edges.forEach((edge) => {
      addEdge(
        edge.source,
        edge.target,
        edge.sourceHandle ?? undefined,
        edge.targetHandle ?? undefined
      );
    });

    // Save to storage
    saveToStorage();
  }

  // Auto-save and validate when nodes or edges change
  watch(
    [nodes, edges],
    () => {
      saveToStorage();
      runValidation();
    },
    { deep: true }
  );

  // Load from storage on initialization
  loadFromStorage();

  // Run initial validation
  runValidation();

  return {
    // State
    nodes,
    edges,
    selectedNodeIds,
    activeNodeId,
    isDragging,
    draggedNodeType,
    validationResult,
    isPaletteOpen,
    pendingEdgeConnection,

    // Getters
    activeNode,
    selectedNodes,
    nodesByCategory,
    isWorkflowValid,
    hasTrigger,
    hasManualTrigger,
    hasWebhookTrigger,

    // Validation Getters
    graphErrors,
    graphWarnings,
    isGraphValid,
    hasCycle,
    errorNodeIds,
    errorEdgeIds,

    // History (Undo/Redo)
    canUndo,
    canRedo,
    undo,
    redo,
    recordSnapshot,
    recordSnapshotDebounced,

    // Validation
    canAddNode,
    canConnect,
    runValidation,
    validateNode,

    // Node Actions
    addNode,
    removeNodes,
    duplicateNodes,
    updateNodeData,
    updateNodePosition,

    // Edge Actions
    addEdge,
    removeEdges,
    hasOutgoingEdge,
    getEdgeEndPosition,

    // Selection Actions
    setActiveNode,
    selectNodes,
    selectAll,
    clearSelection,

    // Drag & Drop
    startDrag,
    endDrag,

    // Palette Drawer
    openPalette,
    closePalette,
    addNodeFromEdge,

    // Persistence
    saveToStorage,
    loadFromStorage,
    clearWorkflow,
    loadWorkflowTemplate,
  };
});
