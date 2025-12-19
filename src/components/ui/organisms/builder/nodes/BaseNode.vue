<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import type { NodeProps } from "@vue-flow/core";
import {
  type WorkflowNodeData,
  WorkflowExecutionStatus,
} from "@/types/workflow";
import { useWorkflowStore } from "@/stores/workflow";

interface Props extends NodeProps {
  data: WorkflowNodeData;
  icon?: string;
  color?: string;
  hasSourceHandle?: boolean;
  hasTargetHandle?: boolean;
  sourceHandles?: { id: string; label: string; position?: Position }[];
}

const props = withDefaults(defineProps<Props>(), {
  hasSourceHandle: true,
  hasTargetHandle: true,
  sourceHandles: () => [],
});

const workflowStore = useWorkflowStore();

const isActive = computed(() => workflowStore.activeNodeId === props.id);
const isSelected = computed(() => workflowStore.selectedNodeIds.has(props.id));
const hasValidationError = computed(() =>
  workflowStore.errorNodeIds.has(props.id)
);

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
</script>

<template>
  <div
    class="workflow-node min-w-[180px] rounded-lg bg-white shadow-lg border-2 transition-all duration-200 cursor-pointer"
    :class="[
      statusClass,
      hasValidationError
        ? 'border-red-500 ring-2 ring-red-200 animate-pulse'
        : isActive
        ? 'border-indigo-500'
        : 'border-gray-200',
      isSelected && !hasValidationError ? 'ring-2 ring-indigo-300' : '',
    ]"
    @click="handleClick"
  >
    <!-- Target Handle (input) -->
    <Handle
      v-if="hasTargetHandle"
      type="target"
      :position="Position.Left"
      class="w-3! h-3! bg-gray-400! border-2! border-white!"
    />

    <!-- Header -->
    <div
      class="flex items-center gap-2 px-3 py-2 rounded-t-md"
      :style="{ backgroundColor: color + '15' }"
    >
      <span class="text-lg">{{ icon }}</span>
      <span class="font-semibold text-sm text-gray-700 truncate">
        {{ data.label }}
      </span>

      <!-- Status indicator -->
      <span
        v-if="data.executionStatus === WorkflowExecutionStatus.RUNNING"
        class="ml-auto w-2 h-2 rounded-full bg-blue-500 animate-pulse"
      />
      <span
        v-else-if="data.executionStatus === WorkflowExecutionStatus.SUCCESS"
        class="ml-auto w-2 h-2 rounded-full bg-green-500"
      />
      <span
        v-else-if="data.executionStatus === WorkflowExecutionStatus.ERROR"
        class="ml-auto w-2 h-2 rounded-full bg-red-500"
      />
    </div>

    <!-- Content slot -->
    <div class="px-3 py-2 text-xs text-gray-500">
      <slot>
        <p v-if="data.description" class="truncate">{{ data.description }}</p>
      </slot>
    </div>

    <!-- Single source handle -->
    <Handle
      v-if="hasSourceHandle && sourceHandles.length === 0"
      type="source"
      :position="Position.Right"
      class="w-3! h-3! bg-indigo-500! border-2! border-white!"
    />

    <!-- Multiple source handles (for conditional nodes: if/else, http) -->
    <template v-if="sourceHandles.length > 0">
      <Handle
        v-for="(handle, index) in sourceHandles"
        :key="handle.id"
        type="source"
        :id="handle.id"
        :position="handle.position || Position.Bottom"
        class="w-3! h-3! border-2! border-white!"
        :class="getHandleClass(handle.id)"
        :style="{
          left: getHandlePosition(index, sourceHandles.length),
        }"
      />
    </template>
  </div>
</template>

<script lang="ts">
// Helper functions for handle positioning and styling
function getHandleClass(handleId: string): string {
  switch (handleId) {
    case "true":
    case "success":
      return "bg-green-500!";
    case "false":
    case "error":
      return "bg-red-500!";
    case "match":
      return "bg-blue-500!";
    case "no_match":
      return "bg-amber-500!";
    default:
      return "bg-indigo-500!";
  }
}

function getHandlePosition(index: number, total: number): string {
  // Distribute handles evenly across the bottom
  const step = 100 / (total + 1);
  return `${step * (index + 1)}%`;
}
</script>

<style scoped></style>
