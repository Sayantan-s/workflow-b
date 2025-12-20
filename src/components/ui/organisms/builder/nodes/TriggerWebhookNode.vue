<script setup lang="ts">
import type { NodeProps } from "@vue-flow/core";
import type { WebhookTriggerData } from "@/types/workflow";
import { Webhook } from "lucide-vue-next";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeContent,
  BaseNodeHandle,
} from "./base";
import { computed } from "vue";

interface Props extends NodeProps {
  data: WebhookTriggerData;
}

const props = defineProps<Props>();

const label = computed(() => props.data.label || "Webhook");
</script>

<template>
  <BaseNode v-bind="$props" color="#22c55e">
    <!-- No target handle since this is a trigger node -->

    <!-- Header with icon -->
    <BaseNodeHeader>
      <template #icon>
        <div class="bg-green-100 border border-green-700/20 p-1.5 rounded-full">
          <Webhook class="text-green-700 fill-green-100 size-4" />
        </div>
      </template>
      <div>
        <div class="text-green-900 text-xs font-medium">{{ label }}</div>
        <p class="text-xs! text-green-800/50 font-normal">
          Triggers on HTTP webhook
        </p>
      </div>
    </BaseNodeHeader>

    <!-- Content -->
    <BaseNodeContent>
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
            {{ props.data.webhookUrl || "No URL set" }}
          </span>
        </div>
        <div
          v-if="props.data.auth.type !== 'none'"
          class="text-[10px] text-gray-400"
        >
          🔒 {{ props.data.auth.type }}
        </div>
      </div>
    </BaseNodeContent>

    <!-- Output handle -->
    <BaseNodeHandle type="source" />
  </BaseNode>
</template>
