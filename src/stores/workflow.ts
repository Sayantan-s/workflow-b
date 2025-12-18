import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import type { Edge } from "@vue-flow/core";
import {
  type NodeType,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowNodeData,
  WorkflowNodeType,
} from "@/types/workflow";
import {
  createDefaultNodeData,
  getVueFlowNodeType,
  generateNodeId,
  generateEdgeId,
} from "@/lib/nodeFactory";

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

  // ============ GETTERS ============
  const activeNode = computed(
    () => nodes.value.find((n) => n.id === activeNodeId.value) ?? null
  );

  const selectedNodes = computed(() =>
    nodes.value.filter((n) => selectedNodeIds.value.has(n.id))
  );

  const nodesByCategory = computed(() => ({
    triggers: nodes.value.filter((n) => n.data.type.startsWith("trigger:")),
    actions: nodes.value.filter((n) => n.data.type.startsWith("action:")),
    logic: nodes.value.filter((n) => n.data.type.startsWith("logic:")),
  }));

  const isWorkflowValid = computed(
    () => nodes.value.length > 0 && nodes.value.every((n) => n.data.isValid)
  );

  const hasTrigger = computed(() =>
    nodes.value.some((n) => n.data.type.startsWith("trigger:"))
  );

  // Check if manual trigger already exists (Constraint: only one allowed)
  const hasManualTrigger = computed(() =>
    nodes.value.some((n) => n.data.type === WorkflowNodeType.TRIGGER_MANUAL)
  );

  // Check if webhook trigger exists
  const hasWebhookTrigger = computed(() =>
    nodes.value.some((n) => n.data.type === WorkflowNodeType.TRIGGER_WEBHOOK)
  );

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
      // You can also emit an event or show a toast notification here
      return null;
    }

    const id = generateNodeId();
    const nodeData = createDefaultNodeData(type);

    const newNode: WorkflowNode = {
      id,
      type: getVueFlowNodeType(type),
      position,
      data: nodeData,
    };

    nodes.value = [...nodes.value, newNode];
    setActiveNode(id);

    return newNode;
  }

  /**
   * Remove nodes by their IDs
   */
  function removeNodes(nodeIds: string[]) {
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
   * Update node data
   */
  function updateNodeData<T extends WorkflowNodeData>(
    nodeId: string,
    data: Partial<T>
  ) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node) {
      node.data = { ...node.data, ...data } as WorkflowNodeData;
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

  // ============ EDGE ACTIONS ============

  /**
   * Check if a connection between two nodes is valid
   */
  function canConnect(
    sourceId: string,
    targetId: string
  ): { allowed: boolean; reason?: string } {
    const sourceNode = nodes.value.find((n) => n.id === sourceId);
    const targetNode = nodes.value.find((n) => n.id === targetId);

    if (!sourceNode || !targetNode) {
      return { allowed: false, reason: "Source or target node not found" };
    }

    const sourceType = sourceNode.data.type;
    const targetType = targetNode.data.type;

    // Constraint 2: Manual trigger and webhook node cannot be connected just after each other
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

    return { allowed: true };
  }

  /**
   * Add a new edge
   */
  function addEdge(
    source: string,
    target: string,
    sourceHandle?: string
  ): WorkflowEdge | null {
    // Check connection constraints
    const validation = canConnect(source, target);
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

    const newEdge: WorkflowEdge = {
      id,
      source,
      target,
      sourceHandle,
      animated: true,
    };

    edges.value = [...edges.value, newEdge];
    return newEdge;
  }

  /**
   * Remove edges by their IDs
   */
  function removeEdges(edgeIds: string[]) {
    edges.value = edges.value.filter(
      (e: Edge) => !edgeIds.includes(e.id)
    ) as WorkflowEdge[];
  }

  // ============ SELECTION ACTIONS ============

  /**
   * Set the active node (for config panel)
   */
  function setActiveNode(nodeId: string | null) {
    activeNodeId.value = nodeId;
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
    if (saved) {
      try {
        const state = JSON.parse(saved);
        nodes.value = state.nodes || [];
        edges.value = state.edges || [];
      } catch (e) {
        console.error("Failed to load workflow from storage:", e);
      }
    }
  }

  /**
   * Clear workflow
   */
  function clearWorkflow() {
    nodes.value = [];
    edges.value = [];
    activeNodeId.value = null;
    selectedNodeIds.value.clear();
    localStorage.removeItem(STORAGE_KEY);
  }

  // Auto-save when nodes or edges change
  watch(
    [nodes, edges],
    () => {
      saveToStorage();
    },
    { deep: true }
  );

  // Load from storage on initialization
  loadFromStorage();

  return {
    // State
    nodes,
    edges,
    selectedNodeIds,
    activeNodeId,
    isDragging,
    draggedNodeType,

    // Getters
    activeNode,
    selectedNodes,
    nodesByCategory,
    isWorkflowValid,
    hasTrigger,
    hasManualTrigger,
    hasWebhookTrigger,

    // Validation
    canAddNode,
    canConnect,

    // Node Actions
    addNode,
    removeNodes,
    updateNodeData,
    updateNodePosition,

    // Edge Actions
    addEdge,
    removeEdges,

    // Selection Actions
    setActiveNode,
    selectNodes,
    selectAll,
    clearSelection,

    // Drag & Drop
    startDrag,
    endDrag,

    // Persistence
    saveToStorage,
    loadFromStorage,
    clearWorkflow,
  };
});
