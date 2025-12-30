<script setup lang="ts">
import { computed } from "vue";
import type { NodeProps } from "@vue-flow/core";
import type { SmsActionData } from "@/types/workflow";
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
  data: SmsActionData;
}

const props = defineProps<Props>();

const label = computed(() => props.data.label || getNodeLabel(props.data.type));
const icon = computed(() => getNodeIcon(props.data.type));
const nodeColor = computed(() => getNodeColor(props.data.type));
const subtext = computed(() => getNodeSubtext(props.data.type));
const iconBgColor = computed(() => getNodeIconBgColor(props.data.type));
const iconBorderColor = computed(() => getNodeIconBorderColor(props.data.type));
const iconTextColor = computed(() => getNodeIconTextColor(props.data.type));

const messageLength = computed(() => props.data.message.length);
const segmentCount = computed(() => Math.ceil(messageLength.value / 160) || 1);
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
