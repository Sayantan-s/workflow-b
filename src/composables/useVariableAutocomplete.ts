import { ref, computed, watch } from "vue";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowExecution } from "@/stores/execution";
import type { WorkflowNode } from "@/types/workflow";

/**
 * Composable for variable autocomplete in inputs/textareas
 * Shows available variables when user types {{ }}
 */
export function useVariableAutocomplete(nodeId?: string) {
  const workflowStore = useWorkflowStore();
  const executionStore = useWorkflowExecution();

  const showAutocomplete = ref(false);
  const autocompletePosition = ref({ top: 0, left: 0 });
  const searchQuery = ref("");
  const selectedIndex = ref(0);

  /**
   * Get all available variables from Transform nodes upstream of the current node
   */
  const availableVariables = computed(() => {
    const variables: Array<{ name: string; source: string; value?: unknown }> = [];

    // Get variables from execution context (from Transform nodes that have run)
    const contextVariables = executionStore.executionContext?.variables || {};
    Object.entries(contextVariables).forEach(([name, value]) => {
      variables.push({
        name,
        source: "Transform node",
        value,
      });
    });

    // Also get variables from Transform nodes in the workflow (even if not executed yet)
    if (nodeId) {
      const currentNode = workflowStore.nodes.find((n) => n.id === nodeId);
      if (currentNode) {
        const upstreamNodes = getUpstreamTransformNodes(currentNode);
        upstreamNodes.forEach((node) => {
          const transformData = node.data;
          if (
            transformData.type === "logic:transform" &&
            transformData.mappings
          ) {
            transformData.mappings.forEach((mapping) => {
              if (
                mapping.variableName &&
                !variables.some((v) => v.name === mapping.variableName)
              ) {
                variables.push({
                  name: mapping.variableName,
                  source: `Transform: ${node.data.label || node.id}`,
                });
              }
            });
          }
        });
      }
    }

    // Filter by search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      return variables.filter((v) =>
        v.name.toLowerCase().includes(query)
      );
    }

    return variables;
  });

  /**
   * Get all upstream Transform nodes
   */
  function getUpstreamTransformNodes(node: WorkflowNode): WorkflowNode[] {
    const transformNodes: WorkflowNode[] = [];
    const visited = new Set<string>();

    function traverse(nodeId: string) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = workflowStore.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Check if this is a Transform node
      if (node.data.type === "logic:transform") {
        transformNodes.push(node);
      }

      // Get upstream nodes
      const upstreamEdges = workflowStore.edges.filter(
        (e) => e.target === nodeId
      );
      upstreamEdges.forEach((edge) => {
        traverse(edge.source);
      });
    }

    // Start from current node's upstream
    const upstreamEdges = workflowStore.edges.filter(
      (e) => e.target === node.id
    );
    upstreamEdges.forEach((edge) => {
      traverse(edge.source);
    });

    return transformNodes;
  }

  /**
   * Show autocomplete at cursor position
   */
  function showAtPosition(
    inputElement: HTMLInputElement | HTMLTextAreaElement,
    cursorPosition: number
  ) {
    // Get text before cursor
    const textBeforeCursor = inputElement.value.substring(0, cursorPosition);
    const lastOpen = textBeforeCursor.lastIndexOf("{{");
    const lastClose = textBeforeCursor.lastIndexOf("}}");

    // Only show if we're inside {{ }}
    if (lastOpen > lastClose) {
      const query = textBeforeCursor
        .substring(lastOpen + 2)
        .trim()
        .toLowerCase();
      searchQuery.value = query;
      selectedIndex.value = 0;

      // Calculate position (approximate)
      const rect = inputElement.getBoundingClientRect();
      autocompletePosition.value = {
        top: rect.top + rect.height + 4,
        left: rect.left + 20,
      };
      showAutocomplete.value = true;
    } else {
      showAutocomplete.value = false;
    }
  }

  /**
   * Hide autocomplete
   */
  function hide() {
    showAutocomplete.value = false;
    searchQuery.value = "";
    selectedIndex.value = 0;
  }

  /**
   * Insert variable at cursor position
   */
  function insertVariable(
    inputElement: HTMLInputElement | HTMLTextAreaElement,
    variableName: string
  ) {
    const value = inputElement.value;
    const cursorPosition = inputElement.selectionStart || 0;

    // Find the {{ that started this
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastOpen = textBeforeCursor.lastIndexOf("{{");

    if (lastOpen >= 0) {
      const before = value.substring(0, lastOpen + 2);
      const after = value.substring(cursorPosition);
      const newValue = `${before} ${variableName} }}${after}`;

      // Update input
      inputElement.value = newValue;
      inputElement.dispatchEvent(new Event("input", { bubbles: true }));

      // Set cursor after the inserted variable
      const newCursorPos = lastOpen + 2 + variableName.length + 4; // {{ + space + name + space + }}
      setTimeout(() => {
        inputElement.setSelectionRange(newCursorPos, newCursorPos);
        inputElement.focus();
      }, 0);
    }

    hide();
  }

  /**
   * Handle keyboard navigation
   */
  function handleKeydown(
    event: KeyboardEvent,
    inputElement: HTMLInputElement | HTMLTextAreaElement
  ) {
    if (!showAutocomplete.value) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedIndex.value = Math.min(
        selectedIndex.value + 1,
        availableVariables.value.length - 1
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const selected = availableVariables.value[selectedIndex.value];
      if (selected) {
        insertVariable(inputElement, selected.name);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      hide();
    }
  }

  return {
    showAutocomplete,
    autocompletePosition,
    availableVariables,
    selectedIndex,
    showAtPosition,
    hide,
    insertVariable,
    handleKeydown,
  };
}

