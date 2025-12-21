import { onMounted, onUnmounted } from "vue";
import { useVueFlow } from "@vue-flow/core";
import { useWorkflowStore } from "@/stores/workflow";

/**
 * Composable for keyboard navigation between connected nodes
 * 
 * Arrow keys navigate through connected nodes:
 * - Right/Down: Navigate to downstream nodes (outgoing connections)
 * - Left/Up: Navigate to upstream nodes (incoming connections)
 */
export function useNodeNavigation() {
  const workflowStore = useWorkflowStore();
  const { fitView, getNode } = useVueFlow();

  /**
   * Get downstream nodes (nodes connected FROM the current node)
   */
  function getDownstreamNodes(nodeId: string): string[] {
    return workflowStore.edges
      .filter((edge) => edge.source === nodeId)
      .map((edge) => edge.target);
  }

  /**
   * Get upstream nodes (nodes connected TO the current node)
   */
  function getUpstreamNodes(nodeId: string): string[] {
    return workflowStore.edges
      .filter((edge) => edge.target === nodeId)
      .map((edge) => edge.source);
  }

  /**
   * Get all connected nodes (both upstream and downstream)
   */
  function getConnectedNodes(nodeId: string): string[] {
    const downstream = getDownstreamNodes(nodeId);
    const upstream = getUpstreamNodes(nodeId);
    return [...new Set([...upstream, ...downstream])];
  }

  /**
   * Check if a node is connected to the graph
   */
  function isNodeConnected(nodeId: string): boolean {
    return workflowStore.edges.some(
      (edge) => edge.source === nodeId || edge.target === nodeId
    );
  }

  /**
   * Focus on a node - set active, select it, and pan canvas to center it
   */
  function focusNode(nodeId: string) {
    // Set as active node (shows config panel)
    workflowStore.setActiveNode(nodeId);
    
    // Select the node visually
    workflowStore.selectNodes([nodeId]);

    // Pan canvas to center on the node with smooth animation
    const node = getNode(nodeId);
    if (node) {
      fitView({
        nodes: [node],
        duration: 300,
        padding: 0.5,
      });
    }
  }

  /**
   * Navigate to downstream node (right/down arrow)
   */
  function navigateDownstream() {
    const activeId = workflowStore.activeNodeId;
    if (!activeId) return;

    const downstream = getDownstreamNodes(activeId);
    if (downstream.length > 0) {
      focusNode(downstream[0]);
    }
  }

  /**
   * Navigate to upstream node (left/up arrow)
   */
  function navigateUpstream() {
    const activeId = workflowStore.activeNodeId;
    if (!activeId) return;

    const upstream = getUpstreamNodes(activeId);
    if (upstream.length > 0) {
      focusNode(upstream[0]);
    }
  }

  /**
   * Navigate to next sibling (Tab)
   * Cycles through all connected nodes in the same "level"
   */
  function navigateNextSibling() {
    const activeId = workflowStore.activeNodeId;
    if (!activeId) return;

    // Get parent nodes
    const upstream = getUpstreamNodes(activeId);
    if (upstream.length === 0) return;

    // Get all siblings (other children of the same parent)
    const parentId = upstream[0];
    const siblings = getDownstreamNodes(parentId);
    
    if (siblings.length <= 1) return;

    // Find current index and navigate to next
    const currentIndex = siblings.indexOf(activeId);
    const nextIndex = (currentIndex + 1) % siblings.length;
    focusNode(siblings[nextIndex]);
  }

  /**
   * Navigate to previous sibling (Shift+Tab)
   */
  function navigatePrevSibling() {
    const activeId = workflowStore.activeNodeId;
    if (!activeId) return;

    // Get parent nodes
    const upstream = getUpstreamNodes(activeId);
    if (upstream.length === 0) return;

    // Get all siblings (other children of the same parent)
    const parentId = upstream[0];
    const siblings = getDownstreamNodes(parentId);
    
    if (siblings.length <= 1) return;

    // Find current index and navigate to previous
    const currentIndex = siblings.indexOf(activeId);
    const prevIndex = (currentIndex - 1 + siblings.length) % siblings.length;
    focusNode(siblings[prevIndex]);
  }

  /**
   * Handle keyboard events for navigation
   */
  function handleKeyDown(e: KeyboardEvent) {
    // Skip if no active node
    if (!workflowStore.activeNodeId) return;

    // Skip if we're in an input field
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    // Skip if active node is not connected
    if (!isNodeConnected(workflowStore.activeNodeId)) return;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        navigateDownstream();
        break;

      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        navigateUpstream();
        break;

      case "Tab":
        if (e.shiftKey) {
          e.preventDefault();
          navigatePrevSibling();
        } else {
          e.preventDefault();
          navigateNextSibling();
        }
        break;
    }
  }

  // Setup and teardown
  onMounted(() => {
    window.addEventListener("keydown", handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });

  return {
    getDownstreamNodes,
    getUpstreamNodes,
    getConnectedNodes,
    isNodeConnected,
    focusNode,
    navigateDownstream,
    navigateUpstream,
    navigateNextSibling,
    navigatePrevSibling,
  };
}

