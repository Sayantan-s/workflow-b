<script setup lang="ts">
import { computed } from "vue";
import {
  DrawerContent,
  DrawerOverlay,
  DrawerPortal,
  DrawerRoot,
  DrawerTitle,
  DrawerDescription,
} from "vaul-vue";
import { X } from "lucide-vue-next";
import {
  NODE_DEFINITIONS,
  type NodeType,
  type NodeCategory,
} from "@/types/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import { useDragAndDrop } from "@/composables/useDragAndDrop";

const workflowStore = useWorkflowStore();
const { onDragStart } = useDragAndDrop();

// Sync drawer open state with store
const isOpen = computed({
  get: () => workflowStore.isPaletteOpen,
  set: (value) => {
    if (!value) workflowStore.closePalette();
  },
});

// Check if we're adding from an edge (vs just browsing)
const isFromEdge = computed(() => !!workflowStore.pendingEdgeConnection);

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

// Check if a node type is disabled
function isNodeDisabled(type: NodeType): boolean {
  return !workflowStore.canAddNode(type).allowed;
}

function getDisabledReason(type: NodeType): string | undefined {
  const validation = workflowStore.canAddNode(type);
  return validation.reason;
}

// Handle node selection from drawer
function selectNode(type: NodeType) {
  if (isNodeDisabled(type)) return;

  if (isFromEdge.value) {
    // Add node and connect to pending edge
    workflowStore.addNodeFromEdge(type);
  } else {
    // Close drawer and start drag mode
    workflowStore.closePalette();
    workflowStore.startDrag(type);
  }
}

// Handle drag start from drawer - use composable and close drawer
function handleDragStart(event: DragEvent, type: NodeType) {
  onDragStart(event, type);
  workflowStore.closePalette();
}
</script>

<template>
  <DrawerRoot v-model:open="isOpen" direction="left">
    <DrawerPortal>
      <DrawerOverlay class="fixed inset-0 bg-black/40 z-40" />
      <DrawerContent
        class="fixed left-0 top-0 bottom-0 z-50 w-80 bg-white outline-none flex flex-col"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-4 py-3 border-b border-gray-200"
        >
          <div>
            <DrawerTitle class="text-sm font-bold text-gray-800 tracking-tight">
              {{ isFromEdge ? "Add Node" : "Node Palette" }}
            </DrawerTitle>
            <DrawerDescription class="text-xs text-gray-500 mt-0.5">
              {{
                isFromEdge ? "Click to add at edge end" : "Drag nodes to canvas"
              }}
            </DrawerDescription>
          </div>
          <button
            class="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            @click="workflowStore.closePalette()"
          >
            <X class="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <!-- Edge context indicator -->
        <div
          v-if="isFromEdge"
          class="mx-4 mt-3 p-2 bg-indigo-50 border border-indigo-200 rounded-lg"
        >
          <p class="text-xs text-indigo-700">
            <span class="font-medium">Adding node:</span>
            The selected node will be connected to the current edge.
          </p>
        </div>

        <!-- Categories -->
        <div class="flex-1 overflow-y-auto p-3">
          <PaletteCategory
            v-for="(nodes, category) in nodesByCategory"
            :key="category"
            :category="category"
            :label="categoryLabels[category]"
            :nodes="nodes"
            :is-node-disabled="isNodeDisabled"
            :get-disabled-reason="getDisabledReason"
            :is-from-edge="isFromEdge"
            @node-click="selectNode"
            @node-drag-start="handleDragStart"
          />
        </div>

        <!-- Footer -->
        <div class="border-t border-gray-100 px-4 py-3">
          <div class="flex items-center justify-between text-xs text-gray-500">
            <span>{{ workflowStore.nodes.length }} nodes</span>
            <span>{{ workflowStore.edges.length }} connections</span>
          </div>
        </div>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>

<style scoped>
/* Drawer animation */
[data-vaul-drawer][data-vaul-drawer-direction="left"][data-state="open"] {
  animation: slideInFromLeft 0.3s ease-out;
}

[data-vaul-drawer][data-vaul-drawer-direction="left"][data-state="closed"] {
  animation: slideOutToLeft 0.2s ease-in;
}

@keyframes slideInFromLeft {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes slideOutToLeft {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-100%);
  }
}
</style>
