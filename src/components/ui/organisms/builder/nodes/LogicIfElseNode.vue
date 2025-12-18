<script setup lang="ts">
import { computed } from "vue";
import type { NodeProps } from "@vue-flow/core";
import type { IfElseLogicData } from "@/types/workflow";
import BaseNode from "./BaseNode.vue";

interface Props extends NodeProps {
  data: IfElseLogicData;
}

const props = defineProps<Props>();

const conditionSummary = computed(() => {
  const conditions = props.data.conditions;
  if (conditions.length === 0) return "No conditions";

  const first = conditions[0];
  if (!first.field) return "Configure condition";

  return `${first.field} ${first.operator} ${first.value}`;
});

// If/Else has two output handles: true and false
const sourceHandles = [
  { id: "true", label: "True" },
  { id: "false", label: "False" },
];
</script>

<template>
  <BaseNode
    v-bind="$props"
    icon="🔀"
    color="#f59e0b"
    :source-handles="sourceHandles"
  >
    <div class="space-y-1">
      <div class="text-xs text-gray-600 truncate max-w-[160px]">
        {{ conditionSummary }}
      </div>
      <div class="flex items-center gap-4 text-[10px] mt-2">
        <span class="text-green-600">✓ True</span>
        <span class="text-red-600">✗ False</span>
      </div>
    </div>
  </BaseNode>
</template>
