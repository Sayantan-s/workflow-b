<script setup lang="ts">
import type { NodeProps } from "@vue-flow/core";
import type { HttpActionData } from "@/types/workflow";

interface Props extends NodeProps {
  data: HttpActionData;
}

const props = defineProps<Props>();

// HTTP Request has two output handles: success and error
const sourceHandles = [
  { id: "success", label: "Success" },
  { id: "error", label: "Error" },
];
</script>

<template>
  <BaseNode
    v-bind="$props"
    icon="🌐"
    color="#3b82f6"
    :source-handles="sourceHandles"
  >
    <div class="space-y-1">
      <div class="flex items-center gap-1">
        <span
          class="px-1.5 py-0.5 text-[10px] font-bold rounded"
          :class="{
            'bg-green-100 text-green-700': props.data.method === 'GET',
            'bg-blue-100 text-blue-700': props.data.method === 'POST',
            'bg-yellow-100 text-yellow-700': props.data.method === 'PUT',
            'bg-orange-100 text-orange-700': props.data.method === 'PATCH',
            'bg-red-100 text-red-700': props.data.method === 'DELETE',
          }"
        >
          {{ props.data.method }}
        </span>
        <span class="text-xs text-gray-500 truncate max-w-[120px]">
          {{ props.data.url || "No URL set" }}
        </span>
      </div>
      <div class="flex items-center gap-2 text-[10px] text-gray-400">
        <span v-if="props.data.auth.type !== 'none'"
          >🔒 {{ props.data.auth.type }}</span
        >
        <span>⏱️ {{ props.data.timeout }}s</span>
        <span class="uppercase">{{ props.data.bodyType }}</span>
      </div>
      <div class="flex items-center gap-4 text-[10px] mt-2">
        <span class="text-green-600">✓ Success</span>
        <span class="text-red-600">✗ Error</span>
      </div>
    </div>
  </BaseNode>
</template>
