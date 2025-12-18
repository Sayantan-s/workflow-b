<script setup lang="ts">
import { computed } from "vue";
import type { NodeProps } from "@vue-flow/core";
import type { DelayLogicData } from "@/types/workflow";
import BaseNode from "./BaseNode.vue";

interface Props extends NodeProps {
  data: DelayLogicData;
}

const props = defineProps<Props>();

const delayText = computed(() => {
  const { delayValue, delayType } = props.data;
  const unit = delayType === "hours" ? "hour" : "day";
  return `${delayValue} ${unit}${delayValue !== 1 ? "s" : ""}`;
});
</script>

<template>
  <BaseNode v-bind="$props" icon="⏱️" color="#f59e0b">
    <div class="flex items-center gap-2">
      <span class="text-xs text-gray-600">Wait for</span>
      <span
        class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium"
      >
        {{ delayText }}
      </span>
    </div>
  </BaseNode>
</template>
