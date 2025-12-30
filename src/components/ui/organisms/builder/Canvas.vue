<script setup lang="ts">
import { watch } from "vue";
import { VueFlow, useVueFlow, ConnectionMode } from "@vue-flow/core";
import type { Connection, ValidConnectionFunc } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { MiniMap } from "@vue-flow/minimap";
import { toast } from "vue-sonner";
import { useWorkflowStore } from "@/stores/workflow";
import { useNodeNavigation } from "@/composables/useNodeNavigation";
import { useDragAndDrop } from "@/composables/useDragAndDrop";
import type { NodeType } from "@/types/workflow";

// Import custom node and edge components
import {
  TriggerManualNode,
  TriggerWebhookNode,
  ActionHttpNode,
  ActionEmailNode,
  ActionSmsNode,
  LogicIfElseNode,
  LogicDelayNode,
  LogicTransformNode,
} from "./nodes";
import WorkFlowEdge from "./WorkFlowEdge.vue";

const workflowStore = useWorkflowStore();

// Debug: Watch nodes array for changes
watch(
  () => workflowStore.nodes,
  (newNodes, oldNodes) => {
    console.log(
      "[Canvas] Nodes changed:",
      oldNodes?.length,
      "->",
      newNodes?.length
    );
    if (newNodes?.length > (oldNodes?.length || 0)) {
      const newNode = newNodes[newNodes.length - 1];
      console.log("[Canvas] New node added:", newNode?.id, newNode?.type);
    }
  },
  { deep: true }
);

// Initialize keyboard navigation for connected nodes
useNodeNavigation();

// Initialize drag and drop state
const { isDragOver, draggedType, onDragOver, onDragLeave, onDragEnd } =
  useDragAndDrop();

// Get VueFlow APIs (this is inside VueFlow context)
const {
  onConnect,
  onNodesChange,
  onEdgesChange,
  screenToFlowCoordinate,
  onNodesInitialized,
  updateNode,
  getNodes,
} = useVueFlow();

/**
 * Handle drop event - creates a new node at the drop position
 * This must be implemented here (inside VueFlow) because it needs VueFlow APIs
 */
function onDrop(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation(); // Prevent bubbling to document listener

  console.log("[Canvas] ========== DROP EVENT ==========");
  console.log("[Canvas] draggedType.value:", draggedType.value);
  console.log(
    "[Canvas] workflowStore.draggedNodeType:",
    workflowStore.draggedNodeType
  );
  console.log(
    "[Canvas] dataTransfer:",
    event.dataTransfer?.getData("application/vueflow")
  );

  // Try multiple sources for the node type (in order of preference)
  const type =
    draggedType.value ||
    workflowStore.draggedNodeType ||
    (event.dataTransfer?.getData("application/vueflow") as NodeType);

  console.log("[Canvas] Resolved type:", type);

  if (!type) {
    console.error("[Canvas] ❌ No node type found from any source!");
    onDragEnd();
    return;
  }

  // Validate that we can add this node type
  const validation = workflowStore.canAddNode(type);
  if (!validation.allowed) {
    console.warn(`Cannot add node: ${validation.reason}`);
    onDragEnd();
    return;
  }

  // Convert screen coordinates to flow coordinates
  const position = screenToFlowCoordinate({
    x: event.clientX,
    y: event.clientY,
  });

  // Add the node through the workflow store
  console.log("[Canvas] Adding node at position:", position);
  const newNode = workflowStore.addNode(type, position);
  console.log("[Canvas] New node created:", newNode);
  console.log("[Canvas] Total nodes in store:", workflowStore.nodes.length);

  if (newNode) {
    // Center the node on the drop position after it's been initialized
    const { off } = onNodesInitialized(() => {
      const nodes = getNodes.value;
      const node = nodes.find((n) => n.id === newNode.id);

      if (node && node.dimensions) {
        // Update position to center the node on the drop point
        const centeredPosition = {
          x: position.x - node.dimensions.width / 2,
          y: position.y - node.dimensions.height / 2,
        };

        updateNode(newNode.id, { position: centeredPosition });
        workflowStore.updateNodePosition(newNode.id, centeredPosition);
      }

      off();
    });
  }

  // Reset drag state
  onDragEnd();
}

// Check if a handle ID is a source handle
function isSourceHandle(handleId: string | null | undefined): boolean {
  if (!handleId) return false;
  return handleId === "source" || handleId.startsWith("source__");
}

// Check if a handle ID is a target handle
function isTargetHandle(handleId: string | null | undefined): boolean {
  if (!handleId) return false;
  return handleId === "target" || handleId.startsWith("target__");
}

// Validate that connections are only source -> target
const isValidConnection: ValidConnectionFunc = (connection: Connection) => {
  // Ensure we have the required handles
  if (!connection.source || !connection.target) return false;

  // Prevent self-connections
  if (connection.source === connection.target) return false;

  const sourceHandleId = connection.sourceHandle;
  const targetHandleId = connection.targetHandle;

  // Check that source handle is actually a source type
  // and target handle is actually a target type
  const sourceIsSource = isSourceHandle(sourceHandleId);
  const targetIsTarget = isTargetHandle(targetHandleId);

  // Valid: source handle → target handle
  if (sourceIsSource && targetIsTarget) {
    return true;
  }

  // Also valid: target handle → source handle (Vue Flow swaps these)
  const sourceIsTarget = isTargetHandle(sourceHandleId);
  const targetIsSource = isSourceHandle(targetHandleId);

  if (sourceIsTarget && targetIsSource) {
    return true;
  }

  // Invalid: same type connections (source→source or target→target)
  return false;
};

// Handle connection between nodes with validation
onConnect((connection: Connection) => {
  if (connection.source && connection.target) {
    // Validate connection before adding
    const validation = workflowStore.canConnect(
      connection.source,
      connection.target,
      connection.sourceHandle ?? undefined,
      connection.targetHandle ?? undefined
    );

    if (!validation.allowed) {
      // Show validation error toast
      toast.error("Connection blocked", {
        description: validation.reason,
      });
      return;
    }

    workflowStore.addEdge(
      connection.source,
      connection.target,
      connection.sourceHandle ?? undefined,
      connection.targetHandle ?? undefined
    );
  }
});

// Watch for graph validation errors and show toasts
watch(
  () => workflowStore.graphErrors,
  (errors, oldErrors) => {
    // Show toast for new errors only
    const oldMessages = new Set(oldErrors?.map((e) => e.message) ?? []);
    errors.forEach((error) => {
      if (!oldMessages.has(error.message)) {
        toast.error("Validation Error", {
          description: error.message,
        });
      }
    });
  },
  { deep: true }
);

// Watch for graph warnings and show toasts
watch(
  () => workflowStore.graphWarnings,
  (warnings, oldWarnings) => {
    // Show toast for new warnings only
    const oldMessages = new Set(oldWarnings?.map((w) => w.message) ?? []);
    warnings.forEach((warning) => {
      if (!oldMessages.has(warning.message)) {
        toast.warning("Warning", {
          description: warning.message,
        });
      }
    });
  },
  { deep: true }
);

// Sync node changes back to store
onNodesChange((changes) => {
  changes.forEach((change) => {
    if (change.type === "position" && change.position && change.id) {
      workflowStore.updateNodePosition(change.id, change.position);
    }
    if (change.type === "remove" && change.id) {
      workflowStore.removeNodes([change.id]);
    }
  });
});

// Sync edge changes back to store
onEdgesChange((changes) => {
  changes.forEach((change) => {
    if (change.type === "remove" && change.id) {
      workflowStore.removeEdges([change.id]);
    }
  });
});

// Handle canvas click to deselect
function onPaneClick() {
  workflowStore.setActiveNode(null);
  workflowStore.clearSelection();
}
</script>

<template>
  <VueFlow
    v-model:nodes="workflowStore.nodes"
    v-model:edges="workflowStore.edges"
    :default-viewport="{ zoom: 0.8, x: 100, y: 50 }"
    :max-zoom="2"
    :min-zoom="0.25"
    :snap-to-grid="true"
    :snap-grid="[15, 15]"
    :connection-mode="ConnectionMode.Strict"
    :is-valid-connection="isValidConnection"
    :delete-key-code="['Backspace', 'Delete']"
    :multi-selection-key-code="['Meta', 'Control']"
    :selection-key-code="['Shift']"
    :disable-keyboard-a11y="true"
    fit-view-on-init
    class="bg-gray-100 relative"
    @pane-click="onPaneClick"
    :style="{
      width: '100vw',
      height: '100vh',
    }"
  >
    <!-- Background pattern -->
    <Background :gap="20" :size="1" pattern-color="#99a1af" variant="dots" />

    <!-- Drop Zone Overlay - Visible only when dragging -->
    <!-- z-10 ensures it's above the grid/nodes but below the UI panels (which are z-20+) -->
    <div
      v-if="isDragOver || draggedType"
      class="absolute inset-0 z-10 flex items-center justify-center transition-all duration-200"
      :class="isDragOver ? 'bg-indigo-50/30 backdrop-blur-[1px]' : ''"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <div
        v-if="isDragOver"
        class="absolute inset-4 border-2 border-dashed border-indigo-400 rounded-xl pointer-events-none"
      />
      <div
        v-if="isDragOver"
        class="px-6 py-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-indigo-200 pointer-events-none"
      >
        <p class="text-sm font-medium text-indigo-600">Drop to add node here</p>
      </div>
    </div>

    <!-- Mini map -->
    <MiniMap
      pannable
      zoomable
      class="bg-white/80! border! border-gray-200! rounded-lg! shadow-sm!"
    />

    <!-- Custom node templates -->
    <template #node-triggerManual="nodeProps">
      <TriggerManualNode v-bind="nodeProps" />
    </template>

    <template #node-triggerWebhook="nodeProps">
      <TriggerWebhookNode v-bind="nodeProps" />
    </template>

    <template #node-actionHttp="nodeProps">
      <ActionHttpNode v-bind="nodeProps" />
    </template>

    <template #node-actionEmail="nodeProps">
      <ActionEmailNode v-bind="nodeProps" />
    </template>

    <template #node-actionSms="nodeProps">
      <ActionSmsNode v-bind="nodeProps" />
    </template>

    <template #node-logicIfElse="nodeProps">
      <LogicIfElseNode v-bind="nodeProps" />
    </template>

    <template #node-logicDelay="nodeProps">
      <LogicDelayNode v-bind="nodeProps" />
    </template>

    <template #node-logicTransform="nodeProps">
      <LogicTransformNode v-bind="nodeProps" />
    </template>

    <!-- Custom edge template with labels -->
    <template #edge-default="edgeProps">
      <WorkFlowEdge v-bind="edgeProps" />
    </template>

    <!-- Slot for additional UI components (Palette, Topbar, ConfigPanel) -->
    <slot />
  </VueFlow>
</template>

<style>
/* Import Vue Flow styles */
@import "@vue-flow/core/dist/style.css";
@import "@vue-flow/core/dist/theme-default.css";
@import "@vue-flow/minimap/dist/style.css";

/* Custom edge styling - default grey */
/* .vue-flow__edge-path {
  stroke: #9ca3af;
  stroke-width: 2;s
}

.vue-flow__edge.selected .vue-flow__edge-path {
  stroke: #6b7280;
  stroke-width: 3;
} */

/* Connection line styling - grey while connecting */
/* .vue-flow__connection-line path {
  stroke: #9ca3af;
  stroke-width: 2;
  stroke-dasharray: 5, 5;
} */

/* Selection box */
.vue-flow__selection {
  background: rgba(156, 163, 175, 0.1);
  border: 1px dashed #9ca3af;
}

/* Handle hover effects */
</style>
