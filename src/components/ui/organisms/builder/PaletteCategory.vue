<script setup lang="ts">
import type { NodeDefinition, NodeCategory } from "@/types/workflow";
import { getNodeIcon, getNodeCategoryIcon } from "@/lib/nodeIcons";

interface Props {
  category: NodeCategory;
  label: string;
  nodes: NodeDefinition[];
  isNodeDisabled: (type: string) => boolean;
  getDisabledReason: (type: string) => string | undefined;
  isFromEdge?: boolean;
  showShortcut?: boolean;
  cursorStyle?: "pointer" | "grab";
}

const props = withDefaults(defineProps<Props>(), {
  isFromEdge: false,
  showShortcut: false,
  cursorStyle: "pointer",
});

const emit = defineEmits<{
  nodeClick: [type: string];
  nodeDragStart: [event: DragEvent, type: string];
  nodeDragEnd?: [event: DragEvent];
}>();

function handleNodeClick(type: string) {
  emit("nodeClick", type);
}

function handleNodeDragStart(event: DragEvent, type: string) {
  emit("nodeDragStart", event, type);
}

function handleNodeDragEnd(event: DragEvent) {
  emit("nodeDragEnd", event);
}
</script>

<template>
  <div class="space-y-3">
    <!-- Category Header -->
    <h3
      class="text-xs text-gray-500 uppercase tracking-wider px-1 flex items-center gap-2"
    >
      <component
        :is="getNodeCategoryIcon(category)"
        class="size-4 text-gray-500"
      />
      {{ label }}
    </h3>

    <!-- Node Items -->
    <div class="space-y-1.5">
      <PaletteNodeItem
        v-for="node in nodes"
        :icon="getNodeIcon(node.type)"
        :key="node.type"
        :node="node"
        :is-disabled="isNodeDisabled(node.type)"
        :disabled-reason="getDisabledReason(node.type)"
        :is-from-edge="isFromEdge"
        :draggable="!isFromEdge"
        :show-shortcut="showShortcut"
        :cursor-style="cursorStyle"
        @click="handleNodeClick"
        @dragstart="handleNodeDragStart"
        @dragend="handleNodeDragEnd"
      />
    </div>
  </div>
</template>
