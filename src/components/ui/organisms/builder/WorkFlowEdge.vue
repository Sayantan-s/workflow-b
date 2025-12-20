<script setup lang="ts">
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  useVueFlow,
} from "@vue-flow/core";
import { computed } from "vue";
import { Plus, ChevronRight } from "lucide-vue-next";
import { useWorkflowStore } from "@/stores/workflow";

interface ExtendedEdgeProps extends EdgeProps {
  data?: {
    label?: string | null;
    condition?: "true" | "false" | "success" | "error";
  };
}

const props = defineProps<ExtendedEdgeProps>();
const workflowStore = useWorkflowStore();
const { getNodes } = useVueFlow();

const path = computed(() => getBezierPath(props));

// Check if this edge has an error
const hasError = computed(() => workflowStore.errorEdgeIds.has(props.id));

// Check if this edge is connected to a target node
const isConnected = computed(() => {
  const nodes = getNodes.value;
  return nodes.some((n) => n.id === props.target);
});

// Get the end position of the edge path for the plus button
const edgeEndPosition = computed(() => {
  // path[3] and path[4] are the target x,y coordinates
  return {
    x: props.targetX,
    y: props.targetY,
  };
});

// Get the edge color based on condition type
const edgeColor = computed(() => {
  if (hasError.value) return "#ef4444"; // Red for errors

  const condition = props.data?.condition || props.sourceHandleId;
  switch (condition) {
    case "true":
    case "success":
      return "#22c55e"; // Green
    case "false":
    case "error":
      return "#ef4444"; // Red
    default:
      return "#6366f1"; // Default indigo
  }
});

// Get the display label for conditional edges
const edgeLabel = computed(() => {
  if (props.data?.label) return props.data.label;

  const handleId = props.sourceHandleId;
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

// Label background color
const labelBgColor = computed(() => {
  const condition = props.data?.condition || props.sourceHandleId;
  switch (condition) {
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
    :path="path[0]"
    :style="{
      stroke: edgeColor,
      strokeWidth: hasError ? 3 : 2,
    }"
    :class="{ 'animate-pulse': hasError }"
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
      <path
        d="M2,2 L10,6 L2,10 L4,6 Z"
        :fill="edgeColor"
      />
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
        class="px-2 py-0.5 text-[10px] font-semibold rounded-full border shadow-sm"
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
