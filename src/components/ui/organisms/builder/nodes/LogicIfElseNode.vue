<script setup lang="ts">
import { computed } from "vue";
import type { NodeProps } from "@vue-flow/core";
import type { IfElseLogicData } from "@/types/workflow";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeContent,
  BaseNodeHandle,
} from "./base";
import {
  getNodeIcon,
  getNodeColor,
  getNodeLabel,
  getNodeSubtext,
  getNodeIconBgColor,
  getNodeIconBorderColor,
  getNodeIconTextColor,
} from "@/lib/nodeIcons";

interface Props extends NodeProps {
  data: IfElseLogicData;
}

const props = defineProps<Props>();

const conditionSummary = computed(() => {
  const conditions = props.data.conditions;
  if (conditions.length === 0) return "No conditions";

  const first = conditions[0];
  if (!first?.field) return "Configure condition";

  return `${first?.field} ${first?.operator} ${first?.value}`;
});

// If/Else has two output handles: true and false
const sourceHandles = [
  { id: "true", label: "True" },
  { id: "false", label: "False" },
];

const label = computed(() => props.data.label || getNodeLabel(props.data.type));
const icon = computed(() => getNodeIcon(props.data.type));
const nodeColor = computed(() => getNodeColor(props.data.type));
const subtext = computed(() => getNodeSubtext(props.data.type));
const iconBgColor = computed(() => getNodeIconBgColor(props.data.type));
const iconBorderColor = computed(() => getNodeIconBorderColor(props.data.type));
const iconTextColor = computed(() => getNodeIconTextColor(props.data.type));
</script>

<template>
  <BaseNode v-bind="$props" :color="nodeColor">
    <BaseNodeHandle type="target" />

    <BaseNodeHeader
      :icon="icon"
      :label="label"
      :subtext="subtext"
      :icon-bg-color="iconBgColor"
      :icon-border-color="iconBorderColor"
      :icon-text-color="iconTextColor"
    />

    <BaseNodeContent>
      <div class="space-y-1">
        <div class="text-xs text-gray-600 truncate max-w-[160px]">
          {{ conditionSummary }}
        </div>
        <div class="flex items-center gap-4 text-[10px] mt-2">
          <span class="text-green-600">✓ True</span>
          <span class="text-red-600">✗ False</span>
        </div>
      </div>
    </BaseNodeContent>

    <BaseNodeHandle type="source" :handles="sourceHandles" />
  </BaseNode>
</template>
