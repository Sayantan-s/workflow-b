<script setup lang="ts">
import { inject, computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import { BASE_NODE_INJECTION_KEY, type HandleConfig } from "./context";

type HandleType = "source" | "target";

interface Props {
  type: HandleType;
  position?: Position;
  id?: string;
  
  // For multiple handles (conditional branches)
  handles?: HandleConfig[];
}

const props = withDefaults(defineProps<Props>(), {
  position: Position.Right,
});

const context = inject(BASE_NODE_INJECTION_KEY);

if (!context) {
  throw new Error("BaseNodeHandle must be used within BaseNode");
}

// Default positions based on handle type
const defaultPosition = computed(() => {
  if (props.position) return props.position;
  return props.type === "target" ? Position.Left : Position.Right;
});

// Handle class based on type and ID
function getHandleClass(handleId?: string): string {
  if (props.type === "target") {
    return "bg-gray-400!";
  }
  
  switch (handleId) {
    case "true":
    case "success":
      return "bg-green-500!";
    case "false":
    case "error":
      return "bg-red-500!";
    case "match":
      return "bg-blue-500!";
    case "no_match":
      return "bg-amber-500!";
    default:
      return "bg-indigo-500!";
  }
}

// Position calculation for multiple handles
function getHandlePosition(index: number, total: number): string {
  const step = 100 / (total + 1);
  return `${step * (index + 1)}%`;
}
</script>

<template>
  <!-- Single handle -->
  <Handle
    v-if="!handles || handles.length === 0"
    :type="type"
    :position="defaultPosition"
    :id="id"
    class="w-3! h-3! border-2! border-white!"
    :class="getHandleClass(id)"
  />

  <!-- Multiple handles (for conditional branches) -->
  <template v-else>
    <Handle
      v-for="(handle, index) in handles"
      :key="handle.id"
      :type="type"
      :id="handle.id"
      :position="handle.position || Position.Bottom"
      class="w-3! h-3! border-2! border-white!"
      :class="getHandleClass(handle.id)"
      :style="{
        left: getHandlePosition(index, handles.length),
      }"
    />
  </template>
</template>

<style scoped></style>

