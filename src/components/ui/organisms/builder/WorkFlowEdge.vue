<script setup lang="ts">
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  useVueFlow,
  getSimpleBezierPath,
} from "@vue-flow/core";
import { computed } from "vue";
import { Plus } from "lucide-vue-next";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowExecution } from "@/stores/execution";

interface EdgeData {
  label?: string | null;
  condition?: "true" | "false" | "success" | "error";
}

type ExtendedEdgeProps = EdgeProps<EdgeData>;

const props = defineProps<ExtendedEdgeProps>();
const workflowStore = useWorkflowStore();
const executionStore = useWorkflowExecution();
const { getNodes } = useVueFlow();

const edgePathParams = computed(() => getSimpleBezierPath(props));

// Extract base handle ID from prefixed handle ID (e.g., "source__true" -> "true")
function getBaseHandleId(handleId?: string | null): string | undefined {
  if (!handleId) return undefined;
  if (handleId.includes("__")) {
    return handleId.split("__")[1];
  }
  // For non-prefixed IDs like "source" or "target", return undefined
  if (handleId === "source" || handleId === "target") {
    return undefined;
  }
  return handleId;
}

// Get the base source handle ID for styling
const baseSourceHandleId = computed(() =>
  getBaseHandleId(props.sourceHandleId)
);

// Check if this edge has a validation error
const hasValidationError = computed(() =>
  workflowStore.errorEdgeIds.has(props.id)
);

// Check if this edge is connected to a target node
const isConnected = computed(() => {
  const nodes = getNodes.value;
  return nodes.some((n) => n.id === props.target);
});

// Get the end position of the edge path for the plus button
const edgeEndPosition = computed(() => {
  return {
    x: props.targetX,
    y: props.targetY,
  };
});

// ============ EXECUTION STATE ============

// Get the source node's execution status
const sourceNodeStatus = computed(() => {
  return executionStore.getNodeStatus(props.source);
});

// Check if the source node is currently running
const isSourceRunning = computed(() => sourceNodeStatus.value === "running");

// Check if the source node has completed successfully
const isSourceSuccess = computed(() => sourceNodeStatus.value === "success");

// Check if the source node has failed
const isSourceError = computed(() => sourceNodeStatus.value === "error");

// Check if the source node was skipped
const isSourceSkipped = computed(() => sourceNodeStatus.value === "skipped");

// Should this edge be animated (when source is running)
const shouldAnimate = computed(() => isSourceRunning.value);

// ============ EDGE STYLING ============

// Get the edge color based on execution state
const edgeColor = computed(() => {
  // Validation error takes priority
  if (hasValidationError.value) return "#ef4444"; // Red

  // Execution-based coloring
  if (isSourceSuccess.value) {
    return "#22c55e"; // Green - source completed successfully
  }

  if (isSourceError.value) {
    return "#ef4444"; // Red - source failed
  }

  // Default grey for idle, running, or skipped states
  return "#9ca3af"; // Grey (gray-400)
});

// Get the display label for conditional edges
const edgeLabel = computed(() => {
  if (props.data?.label) return props.data.label;

  const handleId = baseSourceHandleId.value;
  switch (handleId) {
    case "true":
      return "True";
    case "false":
      return "False";
    case "success":
      return "Success";
    case "error":
      return "Error";
    default:
      return null;
  }
});

// Label background color based on execution state
const labelBgColor = computed(() => {
  const handleId = baseSourceHandleId.value;

  // For conditional branches, show colors based on which path was taken
  if (isSourceSuccess.value && handleId) {
    // Check if this is the path that was taken
    const result = executionStore.getNodeResult(props.source);
    const branch = (result?.output as { branch?: string })?.branch;

    if (branch === handleId) {
      return "bg-green-100 text-green-700 border-green-300";
    } else {
      return "bg-gray-100 text-gray-500 border-gray-300";
    }
  }

  // Default styling based on handle type
  switch (handleId) {
    case "true":
    case "success":
      return "bg-green-100 text-green-700 border-green-300";
    case "false":
    case "error":
      return "bg-red-100 text-red-700 border-red-300";
    default:
      return "bg-white text-gray-700 border-gray-300";
  }
});

// Handle plus button click
function onPlusClick(event: MouseEvent) {
  event.stopPropagation();

  // Get the source node to calculate position
  const sourceNode = getNodes.value.find((n) => n.id === props.source);
  if (!sourceNode) return;

  // Calculate position for new node (to the right of the edge end)
  const position = {
    x: props.targetX + 50,
    y: props.targetY - 50,
  };

  workflowStore.openPalette({
    sourceNodeId: props.source,
    sourceHandle: props.sourceHandleId,
    position,
  });
}
</script>

<script lang="ts">
export default {
  inheritAttrs: false,
};
</script>

<template>
  <!-- Custom styled edge path -->
  <BaseEdge
    :path="edgePathParams[0]"
    :style="{
      stroke: edgeColor,
      strokeWidth: hasValidationError ? 3 : 2,
    }"
    :class="[
      hasValidationError ? 'animate-pulse' : '',
      shouldAnimate ? 'edge-animated' : '',
    ]"
    :marker-end="isConnected ? `url(#arrow-${props.id})` : undefined"
  />

  <!-- Arrow marker definition (only for connected edges) -->
  <defs v-if="isConnected">
    <marker
      :id="`arrow-${props.id}`"
      markerWidth="12"
      markerHeight="12"
      refX="10"
      refY="6"
      orient="auto"
      markerUnits="userSpaceOnUse"
    >
      <path d="M2,2 L10,6 L2,10 L4,6 Z" :fill="edgeColor" />
    </marker>
  </defs>

  <!-- Edge label for conditional branches -->
  <EdgeLabelRenderer>
    <!-- Conditional label (middle of edge) -->
    <div
      v-if="edgeLabel"
      :style="{
        pointerEvents: 'all',
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${path[1]}px,${path[2]}px)`,
      }"
      class="nodrag nopan"
    >
      <span
        class="px-2 py-0.5 text-[10px] font-semibold rounded-full border shadow-sm transition-colors duration-300"
        :class="labelBgColor"
      >
        {{ edgeLabel }}
      </span>
    </div>

    <!-- Plus button at edge end (only for unconnected edges) -->
    <div
      v-if="!isConnected"
      :style="{
        pointerEvents: 'all',
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${edgeEndPosition.x}px,${edgeEndPosition.y}px)`,
      }"
      class="nodrag nopan"
    >
      <button
        class="group flex items-center justify-center w-6 h-6 rounded-full bg-white border-2 shadow-md transition-all duration-150 hover:scale-110 hover:shadow-lg"
        :style="{ borderColor: edgeColor }"
        title="Add node"
        @click="onPlusClick"
      >
        <Plus
          class="w-3.5 h-3.5 transition-transform group-hover:rotate-90"
          :style="{ color: edgeColor }"
        />
      </button>
    </div>
  </EdgeLabelRenderer>
</template>

<style scoped></style>
