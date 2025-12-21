<script setup lang="ts">
import { computed, inject } from "vue";
import { Play, Loader2, CheckCircle, XCircle, SkipForward } from "lucide-vue-next";
import { useWorkflowExecution } from "@/stores/execution";
import { BASE_NODE_INJECTION_KEY } from "./context";
import type { ExecutionStatus } from "@/types/execution";

const executionStore = useWorkflowExecution();
const context = inject(BASE_NODE_INJECTION_KEY);

if (!context) {
  throw new Error("NodeExecutionOverlay must be used within BaseNode");
}

const nodeId = computed(() => context.id);

const status = computed<ExecutionStatus>(() => {
  return executionStore.getNodeStatus(nodeId.value);
});

const result = computed(() => {
  return executionStore.getNodeResult(nodeId.value);
});

const isRunning = computed(() => status.value === "running");
const isSuccess = computed(() => status.value === "success");
const isError = computed(() => status.value === "error");
const isSkipped = computed(() => status.value === "skipped");

const statusColor = computed(() => {
  switch (status.value) {
    case "running":
      return "border-blue-500 bg-blue-50";
    case "success":
      return "border-green-500 bg-green-50";
    case "error":
      return "border-red-500 bg-red-50";
    case "skipped":
      return "border-gray-400 bg-gray-50";
    default:
      return "";
  }
});

const duration = computed(() => {
  if (result.value?.duration) {
    return `${result.value.duration}ms`;
  }
  return null;
});

async function handleRunNode() {
  if (executionStore.isExecuting) return;
  try {
    await executionStore.runNode(nodeId.value);
  } catch (error) {
    console.error("Node execution failed:", error);
  }
}
</script>

<script lang="ts">
export default {
  name: "NodeExecutionOverlay",
};
</script>

<template>
  <!-- Run button (shows on hover when idle) -->
  <button
    v-if="status === 'idle' && !executionStore.isExecuting"
    class="absolute -top-2 -right-2 z-10 flex items-center justify-center w-6 h-6 bg-white border border-gray-200 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-50 hover:border-indigo-300"
    title="Run this node"
    @click.stop="handleRunNode"
  >
    <Play class="w-3 h-3 text-indigo-600" />
  </button>

  <!-- Status indicator -->
  <div
    v-if="status !== 'idle'"
    class="absolute -top-2 -right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shadow-sm"
    :class="statusColor"
  >
    <!-- Running spinner -->
    <Loader2 v-if="isRunning" class="w-3 h-3 animate-spin text-blue-600" />
    
    <!-- Success icon -->
    <CheckCircle v-else-if="isSuccess" class="w-3 h-3 text-green-600" />
    
    <!-- Error icon -->
    <XCircle v-else-if="isError" class="w-3 h-3 text-red-600" />
    
    <!-- Skipped icon -->
    <SkipForward v-else-if="isSkipped" class="w-3 h-3 text-gray-500" />

    <!-- Duration -->
    <span v-if="duration && !isRunning" class="text-gray-600">
      {{ duration }}
    </span>
    
    <!-- Running text -->
    <span v-if="isRunning" class="text-blue-600">Running...</span>
  </div>

  <!-- Error message tooltip -->
  <div
    v-if="isError && result?.error"
    class="absolute top-8 right-0 z-20 max-w-[200px] p-2 bg-red-50 border border-red-200 rounded-lg shadow-lg text-xs text-red-700"
  >
    {{ result.error }}
  </div>
</template>

