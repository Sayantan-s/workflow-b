<script setup lang="ts">
import { computed } from "vue";
import type { NodeProps } from "@vue-flow/core";
import type { DelayLogicData } from "@/types/workflow";
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
  data: DelayLogicData;
}

const props = defineProps<Props>();

const label = computed(() => props.data.label || getNodeLabel(props.data.type));
const icon = computed(() => getNodeIcon(props.data.type));
const nodeColor = computed(() => getNodeColor(props.data.type));
const subtext = computed(() => getNodeSubtext(props.data.type));
const iconBgColor = computed(() => getNodeIconBgColor(props.data.type));
const iconBorderColor = computed(() => getNodeIconBorderColor(props.data.type));
const iconTextColor = computed(() => getNodeIconTextColor(props.data.type));

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
