<script setup lang="ts">
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@vue-flow/core";
import { computed } from "vue";
import { useWorkflowStore } from "@/stores/workflow";

interface ExtendedEdgeProps extends EdgeProps {
  data?: {
    label?: string | null;
    condition?: "true" | "false" | "success" | "error";
  };
}

const props = defineProps<ExtendedEdgeProps>();
const workflowStore = useWorkflowStore();

const path = computed(() => getBezierPath(props));

// Check if this edge has an error
const hasError = computed(() => workflowStore.errorEdgeIds.has(props.id));

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
  />

  <!-- Edge label for conditional branches -->
  <EdgeLabelRenderer>
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
  </EdgeLabelRenderer>
</template>
