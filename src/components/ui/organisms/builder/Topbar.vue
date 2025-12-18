<script setup lang="ts">
import { computed } from "vue";
import { Panel } from "@vue-flow/core";
import { useWorkflowStore } from "@/stores/workflow";

const workflowStore = useWorkflowStore();

const canRun = computed(
  () => workflowStore.hasTrigger && workflowStore.isWorkflowValid
);

function runWorkflow() {
  if (!canRun.value) return;
  // TODO: Implement execution logic
  console.log("Running workflow...");
}
</script>

<template>
  <Panel position="top-center" class="mt-4!">
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

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <!-- Undo/Redo -->
        <div
          class="flex items-center border border-gray-200 rounded-lg overflow-hidden"
        >
          <button
            class="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-40"
            title="Undo"
          >
            <svg
              class="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
          </button>
          <button
            class="p-1.5 hover:bg-gray-100 transition-colors border-l border-gray-200 disabled:opacity-40"
            title="Redo"
          >
            <svg
              class="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
              />
            </svg>
          </button>
        </div>

        <!-- Run button -->
        <button
          class="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canRun"
          @click="runWorkflow"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Run Preview
        </button>
      </div>
    </div>
  </Panel>
</template>
