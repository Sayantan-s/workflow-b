<script setup lang="ts">
import { inject, computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import type { Connection } from "@vue-flow/core";
import { BASE_NODE_INJECTION_KEY, type HandleConfig } from "./context";

type HandleType = "source" | "target";

interface Props {
  type: HandleType;
  position?: Position;
  id?: string;

  // For multiple handles (conditional branches)
  handles?: HandleConfig[];
}

const props = defineProps<Props>();

const context = inject(BASE_NODE_INJECTION_KEY);

if (!context) {
  throw new Error("BaseNodeHandle must be used within BaseNode");
}

// Default positions based on handle type
// Target handles go on the left, source handles go on the right
const defaultPosition = computed(() => {
  if (props.position !== undefined) return props.position;
  return props.type === "target" ? Position.Left : Position.Right;
});

// Generate handle ID with type prefix for validation
function getHandleId(baseId?: string): string {
  if (baseId) {
    return `${props.type}__${baseId}`;
  }
  return props.type;
}

// Check if a handle ID is a source handle
function isSourceHandle(handleId: string | null | undefined): boolean {
  if (!handleId) return false;
  return handleId === "source" || handleId.startsWith("source__");
}

// Check if a handle ID is a target handle
function isTargetHandle(handleId: string | null | undefined): boolean {
  if (!handleId) return false;
  return handleId === "target" || handleId.startsWith("target__");
}

// Validate connections - ensure one source and one target
function isValidConnection(connection: Connection): boolean {
  // Prevent self-connections
  if (connection.source === connection.target) return false;

  const sourceHandleId = connection.sourceHandle;
  const targetHandleId = connection.targetHandle;

  // Check that source handle is actually a source type
  // and target handle is actually a target type
  const sourceIsSource = isSourceHandle(sourceHandleId);
  const targetIsTarget = isTargetHandle(targetHandleId);

  // Valid: source handle → target handle
  if (sourceIsSource && targetIsTarget) {
    return true;
  }

  // Also valid: target handle → source handle (Vue Flow swaps these)
  const sourceIsTarget = isTargetHandle(sourceHandleId);
  const targetIsSource = isSourceHandle(targetHandleId);

  if (sourceIsTarget && targetIsSource) {
    return true;
  }

  // Invalid: same type connections (source→source or target→target)
  return false;
}

// Handle class based on type and base ID (without type prefix)
function getHandleClass(baseId?: string): string {
  // Target handles (input) are gray
  if (props.type === "target") {
    return "bg-gray-400!";
  }

  // Source handles (output) - conditional handles have special colors, default is blue
  switch (baseId) {
    case "true":
    case "success":
      return "bg-emerald-500!";
    case "false":
    case "error":
      return "bg-rose-500!";
    default:
      return "bg-blue-500!";
  }
}

// Position calculation for multiple handles
// Vue Flow automatically positions handles on the correct edge based on the `position` prop
// We need to offset them along that edge using percentage-based positioning
function getHandlePosition(
  index: number,
  total: number,
  position: Position
): Record<string, string> {
  const step = 100 / (total + 1);
  const percentage = `${step * (index + 1)}%`;

  // For right/left positioned handles, use top percentage for vertical distribution
  // Vue Flow will position them on the right/left edge, we just offset vertically
  if (position === Position.Right || position === Position.Left) {
    return {
      top: percentage,
    };
  }
  // For top/bottom positioned handles, use left percentage for horizontal distribution
  if (position === Position.Top || position === Position.Bottom) {
    return {
      left: percentage,
    };
  }
  return {};
}
</script>

<template>
  <!-- Single handle -->
  <Handle
    v-if="!handles || handles.length === 0"
    :type="type"
    :position="defaultPosition"
    :id="getHandleId(id)"
    :is-valid-connection="isValidConnection"
    class="w-3! h-3! border-2! border-white!"
    :class="getHandleClass(id)"
  />

  <template v-else>
    <Handle
      v-for="(handle, index) in handles"
      :key="handle.id"
      :type="type"
      :id="getHandleId(handle.id)"
      :position="handle.position || defaultPosition"
      :is-valid-connection="isValidConnection"
      class="w-3! h-3! border-2! border-white!"
      :class="getHandleClass(handle.id)"
      :style="
        getHandlePosition(
          index,
          handles.length,
          handle.position || defaultPosition
        )
      "
    />
  </template>
</template>

<style scoped></style>
