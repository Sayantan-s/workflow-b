<script setup lang="ts">
import {
  getNodeIcon,
  getNodeIconBgColor,
  getNodeIconBorderColor,
  getNodeIconTextColor,
} from "@/lib/nodeIcons";
import type { NodeDefinition } from "@/types/workflow";
import { Grip } from "lucide-vue-next";
import { computed } from "vue";

interface Props {
  node: NodeDefinition;
  isDisabled: boolean;
  disabledReason?: string;
  isFromEdge?: boolean;
  draggable?: boolean;
  showShortcut?: boolean;
  cursorStyle?: "pointer" | "grab";
}

const props = withDefaults(defineProps<Props>(), {
  isFromEdge: false,
  draggable: false,
  showShortcut: false,
  cursorStyle: "pointer",
});

const emit = defineEmits<{
  click: [type: string];
  dragstart: [event: DragEvent, type: string];
  dragend: [event: DragEvent];
}>();

function handleClick() {
  if (!props.isDisabled) {
    emit("click", props.node.type);
  }
}

function handleDragStart(event: DragEvent) {
  if (!props.isDisabled && props.draggable) {
    emit("dragstart", event, props.node.type);
  }
}

function handleDragEnd(event: DragEvent) {
  emit("dragend", event);
}

const icon = computed(() => getNodeIcon(props.node.type));
const iconBgColor = computed(() => getNodeIconBgColor(props.node.type));
const iconBorderColor = computed(() => getNodeIconBorderColor(props.node.type));
const iconTextColor = computed(() => getNodeIconTextColor(props.node.type));
</script>

<template>
  <div
    :draggable="draggable && !isDisabled"
    class="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 border border-gray-100 overflow-hidden"
    :class="[
      isDisabled
        ? 'bg-gray-100 opacity-50 cursor-not-allowed'
        : cursorStyle === 'grab'
        ? 'bg-white cursor-grab active:cursor-grabbing hover:border-gray-200 hover:shadow-xs'
        : 'bg-white cursor-pointer hover:border-gray-200 hover:shadow-xs',
    ]"
    :title="disabledReason || node.description"
    @click="handleClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <!-- Icon -->
    <div
      class="text-xl transition-transform"
      :class="{
        'group-hover:scale-110': !isDisabled,
      }"
    >
      <div
        class="p-1.5 rounded-full"
        :style="{
          backgroundColor: iconBgColor,
          borderColor: iconBorderColor,
          borderWidth: iconBorderColor ? '1px' : '0',
        }"
      >
        <component
          :is="icon"
          class="size-4"
          :style="{ color: iconTextColor }"
        />
      </div>
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0">
      <div class="text-xs text-gray-700 truncate">
        {{ node.label }}
      </div>
      <div class="text-xs text-gray-400 truncate">
        {{ node.description }}
      </div>
    </div>

    <!-- Constraint indicator -->
    <div v-if="isDisabled" class="flex items-center" :title="disabledReason">
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

    <!-- Add indicator when from edge -->
    <div
      v-else-if="isFromEdge"
      class="opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <span class="text-xs text-indigo-600 font-medium">+ Add</span>
    </div>

    <!-- Shortcut hint (for sidebar palette) -->
    <button>
      <Grip class="size-4 text-gray-400 group-hover:text-gray-600" />
    </button>
  </div>
</template>
