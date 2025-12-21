<script setup lang="ts">
import { computed, provide } from "vue";
import type { NodeProps } from "@vue-flow/core";
import type { WorkflowNodeData } from "@/types/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowExecution } from "@/stores/execution";
import { BASE_NODE_INJECTION_KEY, type BaseNodeContext } from "./context";

interface Props extends NodeProps {
  data: WorkflowNodeData;
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  color: "#6366f1",
});

const workflowStore = useWorkflowStore();
const executionStore = useWorkflowExecution();

// Computed state
const isActive = computed(() => workflowStore.activeNodeId === props.id);
const isSelected = computed(() => workflowStore.selectedNodeIds.has(props.id));
const hasValidationError = computed(() =>
  workflowStore.errorNodeIds.has(props.id)
);

// Get execution status from the execution store
const executionStatus = computed(() => executionStore.getNodeStatus(props.id));

// Execution-based styling (uses border, not ring)
const executionClass = computed(() => {
  switch (executionStatus.value) {
    case "running":
      return "border-blue-400 border animate-pulse";
    case "success":
      return "border-green-400 border";
    case "error":
      return "border-red-400 border";
    case "skipped":
      return "border-gray-300 border opacity-60";
    default:
      return "";
  }
});

function handleClick() {
  workflowStore.setActiveNode(props.id);
}

// Provide context to child components
const context: BaseNodeContext = {
  id: props.id,
  data: props.data,
  color: props.color,
  isActive,
  isSelected,
  hasValidationError,
  executionStatus,
  handleClick,
};

provide(BASE_NODE_INJECTION_KEY, context);
</script>

<template>
  <div
    class="base-node group relative min-w-[250px] rounded-lg bg-white shadow-xs shadow-gray-950/5 transition-all duration-200 cursor-pointer"
    :class="[
      executionClass,
      hasValidationError
        ? 'border-red-500 border animate-pulse'
        : isSelected
        ? 'border-indigo-500 border'
        : isActive
        ? 'border-indigo-400 border'
        : 'border border-gray-200',
    ]"
    @click="handleClick"
  >
    <!-- Execution overlay (run button + status indicator) -->
    <NodeExecutionOverlay />

    <slot />
  </div>
</template>

<style scoped></style>
