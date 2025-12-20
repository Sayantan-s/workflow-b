<script setup lang="ts">
import { computed, provide } from "vue";
import type { NodeProps } from "@vue-flow/core";
import type { WorkflowNodeData } from "@/types/workflow";
import { WorkflowExecutionStatus } from "@/types/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import { BASE_NODE_INJECTION_KEY, type BaseNodeContext } from "./context";

interface Props extends NodeProps {
  data: WorkflowNodeData;
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  color: "#6366f1",
});

const workflowStore = useWorkflowStore();

// Computed state
const isActive = computed(() => workflowStore.activeNodeId === props.id);
const isSelected = computed(() => workflowStore.selectedNodeIds.has(props.id));
const hasValidationError = computed(() =>
  workflowStore.errorNodeIds.has(props.id)
);
const executionStatus = computed(() => props.data.executionStatus);

const statusClass = computed(() => {
  switch (props.data.executionStatus) {
    case WorkflowExecutionStatus.RUNNING:
      return "ring-2 ring-blue-400 animate-pulse";
    case WorkflowExecutionStatus.SUCCESS:
      return "ring-2 ring-green-400";
    case WorkflowExecutionStatus.ERROR:
      return "ring-2 ring-red-400";
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
    class="base-node min-w-[250px] rounded-lg bg-white shadow-xs border shadow-gray-950/5 transition-all duration-200 cursor-pointer"
    :class="[
      statusClass,
      hasValidationError
        ? 'border-red-500 ring-2 ring-red-200 animate-pulse'
        : isActive
        ? 'border-indigo-300'
        : 'border-gray-200',
      isSelected && !hasValidationError ? 'ring-2 ring-indigo-300' : '',
    ]"
    @click="handleClick"
  >
    <slot />
  </div>
</template>

<style scoped></style>
