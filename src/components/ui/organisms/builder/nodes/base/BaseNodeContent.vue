<script setup lang="ts">
import { inject } from "vue";
import { BASE_NODE_INJECTION_KEY } from "./context";

const context = inject(BASE_NODE_INJECTION_KEY);

if (!context) {
  throw new Error("BaseNodeContent must be used within BaseNode");
}
</script>

<template>
  <div class="base-node-content px-3 py-2 text-xs text-gray-500">
    <slot>
      <p v-if="context.data.description" class="truncate">
        {{ context.data.description }}
      </p>
    </slot>
  </div>
</template>

<style scoped></style>

