<script setup lang="ts">
import { computed } from "vue";
import { Panel } from "@vue-flow/core";
import {
  NODE_DEFINITIONS,
  type NodeType,
  type NodeCategory,
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

function onDragStart(event: DragEvent, type: NodeType) {
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
              draggable="true"
              class="group flex items-center gap-3 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-150 border border-transparent hover:border-gray-200 hover:shadow-sm"
              :style="{
                borderLeftColor: node.color,
                borderLeftWidth: '3px',
              }"
              @dragstart="onDragStart($event, node.type)"
              @dragend="onDragEnd"
            >
              <!-- Icon -->
              <span class="text-xl group-hover:scale-110 transition-transform">
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

              <!-- Shortcut hint -->
              <div
                v-if="node.shortcut"
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
