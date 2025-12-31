import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { debounce } from "es-toolkit";
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
const PERSISTENCE_DEBOUNCE_MS = 500;

export const useWorkflowStore = defineStore("workflow", () => {
  // ============ NORMALIZED STATE (O(1) operations) ============
  // Store nodes and edges in Maps for O(1) lookup, add, delete operations
  const nodesMap = ref<Map<string, WorkflowNode>>(new Map());
  const edgesMap = ref<Map<string, WorkflowEdge>>(new Map());

  // Computed arrays for Vue Flow compatibility (reactive)
  const nodes = computed({
    get: () => Array.from(nodesMap.value.values()),
    set: (newNodes: WorkflowNode[]) => {
      const newMap = new Map<string, WorkflowNode>();
      newNodes.forEach((node) => newMap.set(node.id, node));
      nodesMap.value = newMap;
    },
  });

  const edges = computed({
    get: () => Array.from(edgesMap.value.values()),
    set: (newEdges: WorkflowEdge[]) => {
      const newMap = new Map<string, WorkflowEdge>();
      newEdges.forEach((edge) => newMap.set(edge.id, edge));
      edgesMap.value = newMap;
    },
  });

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
      // Rebuild Maps from arrays
      const newNodesMap = new Map<string, WorkflowNode>();
      snapshot.nodes.forEach((node) => newNodesMap.set(node.id, node));
      nodesMap.value = newNodesMap;

      const newEdgesMap = new Map<string, WorkflowEdge>();
      snapshot.edges.forEach((edge) => newEdgesMap.set(edge.id, edge));
      edgesMap.value = newEdgesMap;
    }
  }

  function redo() {
    const snapshot = history.redo(nodes.value, edges.value);
    if (snapshot) {
      // Rebuild Maps from arrays
      const newNodesMap = new Map<string, WorkflowNode>();
      snapshot.nodes.forEach((node) => newNodesMap.set(node.id, node));
      nodesMap.value = newNodesMap;

      const newEdgesMap = new Map<string, WorkflowEdge>();
      snapshot.edges.forEach((edge) => newEdgesMap.set(edge.id, edge));
      edgesMap.value = newEdgesMap;
    }
  }

  function recordSnapshot() {
    history.takeSnapshot(nodes.value, edges.value);
  }

  function recordSnapshotDebounced() {
    history.takeSnapshotDebounced(nodes.value, edges.value);
  }

  // ============ GETTERS ============
  const activeNode = computed(() =>
    activeNodeId.value ? nodesMap.value.get(activeNodeId.value) ?? null : null
  );

  const selectedNodes = computed(() => {
    const result: WorkflowNode[] = [];
    selectedNodeIds.value.forEach((id) => {
      const node = nodesMap.value.get(id);
      if (node) result.push(node);
    });
    return result;
  });

  const nodesByCategory = computed(() => {
    const triggers: WorkflowNode[] = [];
    const actions: WorkflowNode[] = [];
    const logic: WorkflowNode[] = [];

    nodesMap.value.forEach((node) => {
      const type = node?.data?.type;
      if (type?.startsWith("trigger:")) triggers.push(node);
      else if (type?.startsWith("action:")) actions.push(node);
      else if (type?.startsWith("logic:")) logic.push(node);
    });

    return { triggers, actions, logic };
  });

  const isWorkflowValid = computed(() => {
    if (nodesMap.value.size === 0) return false;
    for (const node of nodesMap.value.values()) {
      if (!node?.data?.isValid) return false;
    }
    return true;
  });

  const hasTrigger = computed(() => {
    for (const node of nodesMap.value.values()) {
      if (node?.data?.type?.startsWith("trigger:")) return true;
    }
    return false;
  });

  // Check if manual trigger already exists (Constraint: only one allowed)
  const hasManualTrigger = computed(() => {
    for (const node of nodesMap.value.values()) {
      if (node?.data?.type === WorkflowNodeType.TRIGGER_MANUAL) return true;
    }
    return false;
  });

  // Check if webhook trigger exists
  const hasWebhookTrigger = computed(() => {
    for (const node of nodesMap.value.values()) {
      if (node?.data?.type === WorkflowNodeType.TRIGGER_WEBHOOK) return true;
    }
    return false;
  });

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

    // O(1) add operation
    nodesMap.value.set(id, newNode);
    console.log("[WorkflowStore] Total nodes after add:", nodesMap.value.size);
    setActiveNode(id);

    return newNode;
  }

  /**
   * Remove nodes by their IDs - O(1) per node
   */
  function removeNodes(nodeIds: string[]) {
    if (nodeIds.length === 0) return;

    // Record snapshot before change
    recordSnapshot();

    // O(1) delete operations
    nodeIds.forEach((id) => nodesMap.value.delete(id));

    // Remove connected edges - O(1) per edge lookup
    const edgesToRemove: string[] = [];
    edgesMap.value.forEach((edge, edgeId) => {
      if (nodeIds.includes(edge.source) || nodeIds.includes(edge.target)) {
        edgesToRemove.push(edgeId);
      }
    });
    edgesToRemove.forEach((edgeId) => edgesMap.value.delete(edgeId));

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
      const activeNode = nodesMap.value.get(activeNodeId.value);
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

    // Add duplicated nodes - O(1) per node
    duplicatedNodes.forEach((node) => nodesMap.value.set(node.id, node));
    console.log(
      "[WorkflowStore] Total nodes after duplication:",
      nodesMap.value.size
    );

    // Create duplicated edges (only between duplicated nodes) - O(1) per edge lookup
    const duplicatedEdges: WorkflowEdge[] = [];
    edgesMap.value.forEach((edge) => {
      const newSourceId = nodeIdMap.get(edge.source);
      const newTargetId = nodeIdMap.get(edge.target);

      // Only duplicate edges where both source and target were duplicated
      if (newSourceId && newTargetId) {
        const newEdge: WorkflowEdge = {
          ...edge,
          id: generateEdgeId(
            newSourceId,
            newTargetId,
            edge.sourceHandle || undefined
          ),
          source: newSourceId,
          target: newTargetId,
        };
        duplicatedEdges.push(newEdge);
        // O(1) add operation
        edgesMap.value.set(newEdge.id, newEdge);
      }
    });

    if (duplicatedEdges.length > 0) {
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
   * Validate node data using Zod schema - O(1) lookup
   */
  function validateNode(nodeId: string): {
    valid: boolean;
    errors: string[];
  } {
    const node = nodesMap.value.get(nodeId);
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
   * Update node data with optional Zod validation - O(1) lookup
   */
  function updateNodeData<T extends WorkflowNodeData>(
    nodeId: string,
    data: Partial<T>,
    options?: { validate?: boolean }
  ) {
    const node = nodesMap.value.get(nodeId);
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
   * Update node position - O(1) lookup
   */
  function updateNodePosition(
    nodeId: string,
    position: { x: number; y: number }
  ) {
    const node = nodesMap.value.get(nodeId);
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
    const sourceNode = nodesMap.value.get(sourceId);
    const targetNode = nodesMap.value.get(targetId);

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

    // Check if edge already exists - O(1) lookup
    const existingEdge = edgesMap.value.get(id);
    if (existingEdge) {
      return existingEdge;
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

    // O(1) add operation
    edgesMap.value.set(id, newEdge);

    // Re-run validation after adding edge
    runValidation();

    return newEdge;
  }

  /**
   * Remove edges by their IDs - O(1) per edge
   */
  function removeEdges(edgeIds: string[]) {
    if (edgeIds.length === 0) return;

    // Record snapshot before change
    recordSnapshot();

    // O(1) delete operations
    edgeIds.forEach((id) => edgesMap.value.delete(id));
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
    selectNodes(Array.from(nodesMap.value.keys()));
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
    for (const edge of edgesMap.value.values()) {
      if (
        edge.source === nodeId &&
        (handleId ? edge.sourceHandle === handleId : true)
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the end position for an edge (for plus button placement) - O(1) lookup
   */
  function getEdgeEndPosition(nodeId: string): { x: number; y: number } | null {
    const node = nodesMap.value.get(nodeId);
    if (!node) return null;

    // Calculate position to the right of the source node
    return {
      x: node.position.x + 300,
      y: node.position.y + 50,
    };
  }

  // ============ PERSISTENCE ============

  /**
   * Save workflow to localStorage (immediate, no debounce)
   */
  function saveToStorageImmediate() {
    const state = {
      nodes: Array.from(nodesMap.value.values()),
      edges: Array.from(edgesMap.value.values()),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /**
   * Save workflow to localStorage with 500ms debounce using es-toolkit
   */
  const saveToStorage = debounce(
    saveToStorageImmediate,
    PERSISTENCE_DEBOUNCE_MS
  );

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
        const loadedNodes = state.nodes || [];
        const loadedEdges = state.edges || [];

        // Rebuild Maps from arrays - O(n) but only on load
        const newNodesMap = new Map<string, WorkflowNode>();
        loadedNodes.forEach((node: WorkflowNode) => {
          newNodesMap.set(node.id, node);
        });
        nodesMap.value = newNodesMap;

        const newEdgesMap = new Map<string, WorkflowEdge>();
        loadedEdges.forEach((edge: WorkflowEdge) => {
          newEdgesMap.set(edge.id, edge);
        });
        edgesMap.value = newEdgesMap;

        console.log("[WorkflowStore] Loaded nodes:", nodesMap.value.size);
        console.log(
          "[WorkflowStore] Node types:",
          Array.from(nodesMap.value.values()).map((n: WorkflowNode) => n.type)
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

    // O(1) clear operations
    nodesMap.value.clear();
    edgesMap.value.clear();
    activeNodeId.value = null;
    selectedNodeIds.value.clear();
    localStorage.removeItem(STORAGE_KEY);

    // Cancel any pending debounced save
    saveToStorage.cancel();

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
    nodesMap.value.clear();
    edgesMap.value.clear();
    activeNodeId.value = null;
    selectedNodeIds.value.clear();

    // Deep clone nodes and add to Map - O(n) but only on template load
    template.nodes.forEach((node) => {
      const clonedNode: WorkflowNode = {
        ...node,
        data: { ...node.data } as WorkflowNodeData,
      };
      nodesMap.value.set(node.id, clonedNode);
    });

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

    // Save to storage (will be debounced)
    saveToStorage();
  }

  // Auto-save and validate when nodes or edges change
  // Watch the Maps directly for better performance
  watch(
    [nodesMap, edgesMap],
    () => {
      saveToStorage(); // Debounced
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
