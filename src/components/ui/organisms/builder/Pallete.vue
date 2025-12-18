<script setup lang="ts">
import { computed } from "vue";
import { Panel } from "@vue-flow/core";
import {
  NODE_DEFINITIONS,
  type NodeType,
  type NodeCategory,
  WorkflowNodeType,
} from "@/types/workflow";
import { useWorkflowStore } from "@/stores/workflow";

const workflowStore = useWorkflowStore();

// Group nodes by category
const nodesByCategory = computed(() => {
  const categories: Record<NodeCategory, typeof NODE_DEFINITIONS> = {
    trigger: [],
    action: [],
    logic: [],
  };

  NODE_DEFINITIONS.forEach((node) => {
    categories[node.category].push(node);
  });

  return categories;
});

const categoryLabels: Record<NodeCategory, string> = {
  trigger: "🎯 Triggers",
  action: "⚡ Actions",
  logic: "🧠 Logic",
};

// Check if a node type is disabled due to constraints
function isNodeDisabled(type: NodeType): boolean {
  return !workflowStore.canAddNode(type).allowed;
}

// Get the reason why a node is disabled
function getDisabledReason(type: NodeType): string | undefined {
  const validation = workflowStore.canAddNode(type);
  return validation.reason;
}

function onDragStart(event: DragEvent, type: NodeType) {
  // Prevent dragging disabled nodes
  if (isNodeDisabled(type)) {
    event.preventDefault();
    return;
  }

  if (event.dataTransfer) {
    event.dataTransfer.setData("application/vueflow", type);
    event.dataTransfer.effectAllowed = "move";
  }
  workflowStore.startDrag(type);
}

function onDragEnd() {
  workflowStore.endDrag();
}
</script>

<template>
  <Panel position="top-left" class="m-0!">
    <aside
      class="w-64 h-screen bg-white/95 backdrop-blur-sm border-r border-gray-200 overflow-y-auto"
    >
      <!-- Header -->
      <div
        class="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-10"
      >
        <h2 class="text-sm font-bold text-gray-800 tracking-tight">
          Node Palette
        </h2>
        <p class="text-xs text-gray-500 mt-0.5">Drag nodes to canvas</p>
      </div>

      <!-- Categories -->
      <div class="p-3 space-y-4">
        <div
          v-for="(nodes, category) in nodesByCategory"
          :key="category"
          class="space-y-2"
        >
          <!-- Category Header -->
          <h3
            class="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1"
          >
            {{ categoryLabels[category] }}
          </h3>

          <!-- Node Items -->
          <div class="space-y-1.5">
            <div
              v-for="node in nodes"
              :key="node.type"
              :draggable="!isNodeDisabled(node.type)"
              class="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 border border-transparent"
              :class="[
                isNodeDisabled(node.type)
                  ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                  : 'bg-gray-50 hover:bg-gray-100 cursor-grab active:cursor-grabbing hover:border-gray-200 hover:shadow-sm',
              ]"
              :style="{
                borderLeftColor: node.color,
                borderLeftWidth: '3px',
              }"
              :title="getDisabledReason(node.type) || node.description"
              @dragstart="onDragStart($event, node.type)"
              @dragend="onDragEnd"
            >
              <!-- Icon -->
              <span
                class="text-xl transition-transform"
                :class="{ 'group-hover:scale-110': !isNodeDisabled(node.type) }"
              >
                {{ node.icon }}
              </span>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-700 truncate">
                  {{ node.label }}
                </div>
                <div class="text-xs text-gray-400 truncate">
                  {{ node.description }}
                </div>
              </div>

              <!-- Constraint indicator -->
              <div
                v-if="isNodeDisabled(node.type)"
                class="flex items-center"
                :title="getDisabledReason(node.type)"
              >
                <svg
                  class="w-4 h-4 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <!-- Shortcut hint (only show if not disabled) -->
              <div
                v-else-if="node.shortcut"
                class="hidden group-hover:flex items-center gap-0.5 opacity-60"
              >
                <kbd
                  class="px-1 py-0.5 text-[9px] bg-gray-200 rounded font-mono"
                >
                  {{ node.shortcut.split("+").slice(-1)[0] }}
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer with workflow info -->
      <div class="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3">
        <div class="flex items-center justify-between text-xs text-gray-500">
          <span>{{ workflowStore.nodes.length }} nodes</span>
          <span>{{ workflowStore.edges.length }} connections</span>
        </div>
        <button
          v-if="workflowStore.nodes.length > 0"
          class="mt-2 w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors"
          @click="workflowStore.clearWorkflow()"
        >
          Clear Workflow
        </button>
      </div>
    </aside>
  </Panel>
</template>

<style scoped>
aside {
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;
}

aside::-webkit-scrollbar {
  width: 6px;
}

aside::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 3px;
}
</style>
