<script setup lang="ts">
import { computed } from "vue";
import type { NodeProps } from "@vue-flow/core";
import type { SmsActionData } from "@/types/workflow";
import { MessageSquare } from "lucide-vue-next";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeContent,
  BaseNodeHandle,
} from "./base";

interface Props extends NodeProps {
  data: SmsActionData;
}

const props = defineProps<Props>();

const messageLength = computed(() => props.data.message.length);
const segmentCount = computed(() => Math.ceil(messageLength.value / 160) || 1);
</script>

<template>
  <BaseNode v-bind="$props" color="#3b82f6">
    <BaseNodeHandle type="target" />

    <BaseNodeHeader>
      <template #icon>
        <MessageSquare />
      </template>
      Send SMS
    </BaseNodeHeader>

    <BaseNodeContent>
      <div class="space-y-1">
        <div class="text-xs text-gray-600 truncate max-w-[160px]">
          {{ props.data.toNumber || "No number set" }}
        </div>
        <div class="text-[10px] text-gray-400 truncate max-w-[160px]">
          {{ props.data.message || "No message" }}
        </div>
        <div class="text-[10px] text-gray-400">
          {{ messageLength }}/160 · {{ segmentCount }} segment{{
            segmentCount !== 1 ? "s" : ""
          }}
        </div>
      </div>
    </BaseNodeContent>

    <BaseNodeHandle type="source" />
  </BaseNode>
</template>
