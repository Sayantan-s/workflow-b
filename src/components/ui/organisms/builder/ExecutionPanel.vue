<script setup lang="ts">
import { computed, ref } from "vue";
import { Panel } from "@vue-flow/core";
import {
  Terminal,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  Trash2,
} from "lucide-vue-next";
import { useWorkflowExecution } from "@/stores/execution";

const executionStore = useWorkflowExecution();

const isExpanded = ref(false);
const isVisible = ref(true);

const logs = computed(() => executionStore.executionLog);
const hasLogs = computed(() => logs.value.length > 0);

const logTypeIcon = {
  info: Info,
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
};

const logTypeClass = {
  info: "text-blue-600 bg-blue-50",
  success: "text-green-600 bg-green-50",
  error: "text-red-600 bg-red-50",
  warning: "text-amber-600 bg-amber-50",
};

function toggleExpand() {
  isExpanded.value = !isExpanded.value;
}

function clearLogs() {
  executionStore.resetExecution();
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}
</script>

<template>
  <Panel v-if="isVisible && hasLogs" position="bottom-center" class="mb-4!">
    <div
      class="bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700 overflow-hidden transition-all duration-300"
      :class="isExpanded ? 'w-[600px]' : 'w-[400px]'"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 cursor-pointer"
        @click="toggleExpand"
      >
        <div class="flex items-center gap-2">
          <Terminal class="w-4 h-4 text-green-400" />
          <span class="text-sm font-medium text-gray-200">Execution Log</span>
          <span
            class="px-2 py-0.5 text-[10px] font-medium bg-gray-700 text-gray-300 rounded-full"
          >
            {{ logs.length }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="p-1 text-gray-400 hover:text-gray-200 transition-colors"
            title="Clear logs"
            @click.stop="clearLogs"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
          <button
            class="p-1 text-gray-400 hover:text-gray-200 transition-colors"
            :title="isExpanded ? 'Collapse' : 'Expand'"
          >
            <ChevronUp v-if="isExpanded" class="w-4 h-4" />
            <ChevronDown v-else class="w-4 h-4" />
          </button>
          <button
            class="p-1 text-gray-400 hover:text-gray-200 transition-colors"
            title="Close"
            @click.stop="isVisible = false"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Log content -->
      <div
        class="overflow-y-auto font-mono text-xs"
        :class="isExpanded ? 'max-h-[300px]' : 'max-h-[120px]'"
      >
        <div
          v-for="(log, index) in logs"
          :key="index"
          class="flex items-start gap-2 px-4 py-1.5 border-b border-gray-800 hover:bg-gray-800/50"
        >
          <!-- Timestamp -->
          <span class="text-gray-500 shrink-0">
            {{ formatTimestamp(log.timestamp) }}
          </span>

          <!-- Type icon -->
          <div class="p-0.5 rounded shrink-0" :class="logTypeClass[log.type]">
            <component :is="logTypeIcon[log.type]" class="w-3 h-3" />
          </div>

          <!-- Node ID -->
          <span class="text-purple-400 shrink-0">
            [{{ log.nodeId === "system" ? "SYS" : log.nodeId.slice(0, 8) }}]
          </span>

          <!-- Message -->
          <span class="text-gray-300 break-all">
            {{ log.message }}
          </span>
        </div>

        <!-- Empty state -->
        <div
          v-if="logs.length === 0"
          class="flex items-center justify-center py-8 text-gray-500"
        >
          No execution logs yet
        </div>
      </div>
    </div>
  </Panel>
</template>
