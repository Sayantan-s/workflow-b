<script setup lang="ts">
import { watch } from "vue";
import { VueFlow, useVueFlow, ConnectionMode } from "@vue-flow/core";
import type { Connection } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { MiniMap } from "@vue-flow/minimap";
import { toast } from "vue-sonner";
import { useWorkflowStore } from "@/stores/workflow";
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

const { onConnect, onNodesChange, onEdgesChange, project, vueFlowRef } =
  useVueFlow();

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

// Handle drop from palette
function onDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
}

function onDrop(event: DragEvent) {
  const type = event.dataTransfer?.getData("application/vueflow") as NodeType;

  if (!type || !vueFlowRef.value) return;

  // Get the drop position relative to the canvas
  const { left, top } = vueFlowRef.value.getBoundingClientRect();
  const position = project({
    x: event.clientX - left,
    y: event.clientY - top,
  });

  workflowStore.addNode(type, position);
  workflowStore.endDrag();
}

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
    :delete-key-code="['Backspace', 'Delete']"
    :multi-selection-key-code="['Meta', 'Control']"
    :selection-key-code="['Shift']"
    fit-view-on-init
    class="bg-gray-100"
    @dragover="onDragOver"
    @drop="onDrop"
    @pane-click="onPaneClick"
    :style="{
      width: '100vw',
      height: '100vh',
    }"
  >
    <!-- Background pattern -->
    <Background :gap="20" :size="1" pattern-color="#99a1af" variant="dots" />

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

/* Custom edge styling */
.vue-flow__edge-path {
  stroke: #6366f1;
  stroke-width: 2;
}

.vue-flow__edge.selected .vue-flow__edge-path {
  stroke: #4f46e5;
  stroke-width: 3;
}

.vue-flow__edge.animated .vue-flow__edge-path {
  stroke-dasharray: 5;
  animation: dashdraw 0.5s linear infinite;
}

@keyframes dashdraw {
  from {
    stroke-dashoffset: 10;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* Connection line styling */
.vue-flow__connection-line path {
  stroke: #6366f1;
  stroke-width: 2;
  stroke-dasharray: 5, 5;
}

/* Selection box */
.vue-flow__selection {
  background: rgba(99, 102, 241, 0.1);
  border: 1px dashed #6366f1;
}

/* Handle hover effects */
</style>
