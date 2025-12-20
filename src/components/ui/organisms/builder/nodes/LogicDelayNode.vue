<script setup lang="ts">
import { computed } from "vue";
import type { NodeProps } from "@vue-flow/core";
import type { DelayLogicData } from "@/types/workflow";
import { Clock } from "lucide-vue-next";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeContent,
  BaseNodeHandle,
} from "./base";

interface Props extends NodeProps {
  data: DelayLogicData;
}

const props = defineProps<Props>();

const delayText = computed(() => {
  const { delayValue, delayUnit } = props.data;
  const unitMap: Record<string, string> = {
    seconds: "second",
    minutes: "minute",
    hours: "hour",
    days: "day",
  };
  const unit = unitMap[delayUnit] || delayUnit;
  return `${delayValue} ${unit}${delayValue !== 1 ? "s" : ""}`;
});
</script>

<template>
  <BaseNode v-bind="$props" color="#f59e0b">
    <BaseNodeHandle type="target" />

    <BaseNodeHeader>
      <template #icon>
        <Clock />
      </template>
      Delay
    </BaseNodeHeader>

    <BaseNodeContent>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-600">Wait for</span>
        <span
          class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium"
        >
          {{ delayText }}
        </span>
      </div>
    </BaseNodeContent>

    <BaseNodeHandle type="source" />
  </BaseNode>
</template>
