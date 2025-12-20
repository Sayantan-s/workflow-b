<script setup lang="ts">
import { inject } from "vue";
import { WorkflowExecutionStatus } from "@/types/workflow";
import { BASE_NODE_INJECTION_KEY } from "./context";

const context = inject(BASE_NODE_INJECTION_KEY);

if (!context) {
  throw new Error("BaseNodeHeader must be used within BaseNode");
}
</script>

<template>
  <div
    class="base-node-header flex items-center gap-2 px-2 py-2.5 rounded-t-md"
    :style="{ backgroundColor: context.color + '15' }"
  >
    <!-- Icon slot -->
    <span class="shrink-0 [&>svg]:size-4" :style="{ color: context.color }">
      <slot name="icon" />
    </span>

    <!-- Title (default slot) -->
    <span class="text-sm truncate">
      <slot />
    </span>

    <!-- Status indicator -->
    <span
      v-if="context.executionStatus.value === WorkflowExecutionStatus.RUNNING"
      class="ml-auto w-2 h-2 rounded-full bg-blue-500 animate-pulse"
    />
    <span
      v-else-if="
        context.executionStatus.value === WorkflowExecutionStatus.SUCCESS
      "
      class="ml-auto w-2 h-2 rounded-full bg-green-500"
    />
    <span
      v-else-if="
        context.executionStatus.value === WorkflowExecutionStatus.ERROR
      "
      class="ml-auto w-2 h-2 rounded-full bg-red-500"
    />

    <!-- Extra slot for additional header content -->
    <slot name="extra" />
  </div>
</template>

<style scoped></style>
