<script setup lang="ts">
import { computed, ref } from "vue";
import { Panel } from "@vue-flow/core";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-vue-next";
import {
  NODE_DEFINITIONS,
  type NodeType,
  type NodeCategory,
} from "@/types/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import { useDragAndDrop } from "@/composables/useDragAndDrop";

const workflowStore = useWorkflowStore();
const { onDragStart, onDragEnd } = useDragAndDrop();

// Collapsed state
const isCollapsed = ref(false);

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
  trigger: "Triggers",
  action: "Actions",
  logic: "Logic",
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

function toggleCollapsed() {
  isCollapsed.value = !isCollapsed.value;
}

function openPaletteDrawer() {
  workflowStore.openPalette();
}
</script>

<template>
  <Panel position="top-left" class="m-0! z-20!">
    <!-- Collapsed state: just a button -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="-translate-x-full opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="-translate-x-full opacity-0"
    >
      <div
        v-if="isCollapsed"
        class="flex flex-col gap-2 p-2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-r-lg shadow-sm"
      >
        <button
          class="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Open palette"
          @click="openPaletteDrawer"
        >
          <LayoutGrid class="w-5 h-5 text-gray-600" />
        </button>
        <button
          class="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Expand sidebar"
          @click="toggleCollapsed"
        >
          <ChevronRight class="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </Transition>

    <!-- Expanded state: full sidebar -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="-translate-x-full opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="-translate-x-full opacity-0"
    >
      <aside
        v-if="!isCollapsed"
        class="w-64 h-screen bg-white/95 backdrop-blur-sm border-r border-gray-200 overflow-y-auto"
      >
        <!-- Header -->
        <div
          class="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-10"
        >
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-gray-800 tracking-tight">
                Node Palette
              </h2>
              <p class="text-xs text-gray-500 mt-0.5">Drag nodes to canvas</p>
            </div>
            <button
              class="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              title="Collapse sidebar"
              @click="toggleCollapsed"
            >
              <ChevronLeft class="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <!-- Categories -->
        <div class="p-3 space-y-4">
          <PaletteCategory
            v-for="(nodes, category) in nodesByCategory"
            :key="category"
            :category="category"
            :label="categoryLabels[category]"
            :nodes="nodes"
            :is-node-disabled="isNodeDisabled"
            :get-disabled-reason="getDisabledReason"
            :show-shortcut="true"
            cursor-style="grab"
            @node-drag-start="onDragStart"
            @node-drag-end="onDragEnd"
          />
        </div>

        <!-- Footer with workflow info -->
        <div
          class="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3"
        >
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
    </Transition>
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
