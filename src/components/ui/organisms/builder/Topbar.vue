<script setup lang="ts">
import { computed } from "vue";
import { Panel } from "@vue-flow/core";
import {
  Play,
  Square,
  RotateCcw,
  Loader2,
  Undo2,
  Redo2,
  Plus,
} from "lucide-vue-next";
import { toast } from "vue-sonner";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowExecution } from "@/stores/execution";
import { WorkflowNodeType } from "@/types/workflow";

const workflowStore = useWorkflowStore();
const executionStore = useWorkflowExecution();

// Debug: Add a test node directly
function addTestNode() {
  const position = {
    x: 200 + Math.random() * 200,
    y: 200 + Math.random() * 200,
  };
  console.log("[Topbar] Adding test node at:", position);
  const node = workflowStore.addNode(WorkflowNodeType.ACTION_HTTP, position);
  console.log("[Topbar] Node added:", node);
  console.log("[Topbar] Total nodes:", workflowStore.nodes.length);
  toast.success("Test node added", { description: `Node ID: ${node?.id}` });
}

const canRun = computed(
  () =>
    workflowStore.hasTrigger &&
    workflowStore.nodes.length > 0 &&
    !executionStore.isExecuting
);

const isExecuting = computed(() => executionStore.isExecuting);

const executionProgress = computed(() => {
  const total = workflowStore.nodes.length;
  const completed = executionStore.executionPathNodes.length;
  return total > 0 ? Math.round((completed / total) * 100) : 0;
});

// Undo/Redo
function handleUndo() {
  if (workflowStore.canUndo) {
    workflowStore.undo();
  }
}

function handleRedo() {
  if (workflowStore.canRedo) {
    workflowStore.redo();
  }
}

async function runWorkflow() {
  if (!canRun.value) return;

  try {
    toast.info("Starting workflow execution...", {
      description: "Running preview mode",
    });
    await executionStore.executeWorkflow();

    const errors = executionStore.executionErrors;
    if (errors.length > 0) {
      toast.error("Workflow completed with errors", {
        description: `${errors.length} node(s) failed`,
      });
    } else {
      toast.success("Workflow completed successfully!", {
        description: `Executed ${executionStore.executionPathNodes.length} nodes`,
      });
    }
  } catch (error) {
    toast.error("Workflow execution failed", {
      description: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function stopWorkflow() {
  executionStore.stopExecution();
  toast.warning("Workflow execution stopped");
}

function resetWorkflow() {
  executionStore.resetExecution();
  toast.info("Execution state reset");
}
</script>

<template>
  <Panel position="top-center" class="mt-4! z-20!">
    <div
      class="flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200"
    >
      <!-- Workflow title -->
      <div class="flex items-center gap-2 pr-4 border-r border-gray-200">
        <div
          class="w-2 h-2 rounded-full"
          :class="
            workflowStore.isWorkflowValid ? 'bg-green-500' : 'bg-amber-500'
          "
        />
        <span class="text-sm font-medium text-gray-700">Untitled Workflow</span>
      </div>

      <!-- Node count -->
      <div class="flex items-center gap-1 px-2 text-xs text-gray-500">
        <span>{{ workflowStore.nodes.length }}</span>
        <span>nodes</span>
      </div>

      <!-- Debug: Test add node button -->
      <button
        class="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200"
        @click="addTestNode"
        title="Debug: Add test HTTP node"
      >
        <Plus class="w-3 h-3" />
        Test Add
      </button>

      <!-- Execution progress (when running) -->
      <div
        v-if="isExecuting"
        class="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg"
      >
        <Loader2 class="w-3 h-3 text-blue-600 animate-spin" />
        <span class="text-xs font-medium text-blue-700">
          Running... {{ executionProgress }}%
        </span>
      </div>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <!-- Reset button -->
        <button
          v-if="executionStore.executionPathNodes.length > 0 && !isExecuting"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          title="Reset execution state"
          @click="resetWorkflow"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          Reset
        </button>

        <!-- Undo/Redo -->
        <div
          class="flex items-center border border-gray-200 rounded-lg overflow-hidden"
        >
          <button
            class="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!workflowStore.canUndo"
            title="Undo (Cmd+Z)"
            @click="handleUndo"
          >
            <Undo2 class="w-4 h-4 text-gray-600" />
          </button>
          <button
            class="p-1.5 hover:bg-gray-100 transition-colors border-l border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!workflowStore.canRedo"
            title="Redo (Cmd+Shift+Z)"
            @click="handleRedo"
          >
            <Redo2 class="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <!-- Stop button (when running) -->
        <button
          v-if="isExecuting"
          class="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all shadow-sm hover:shadow"
          @click="stopWorkflow"
        >
          <Square class="w-4 h-4" />
          Stop
        </button>

        <!-- Run button -->
        <button
          v-else
          class="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canRun"
          @click="runWorkflow"
        >
          <Play class="w-4 h-4" />
          Run Preview
        </button>
      </div>
    </div>
  </Panel>
</template>
