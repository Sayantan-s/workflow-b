<script setup lang="ts">
import type { NodeProps } from "@vue-flow/core";
import type { WebhookTriggerData } from "@/types/workflow";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeContent,
  BaseNodeHandle,
} from "./base";
import { computed } from "vue";
import { Position } from "@vue-flow/core";
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
  data: WebhookTriggerData;
}

const props = defineProps<Props>();

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
    <!-- Target handle (webhook can receive from other nodes) -->
    <BaseNodeHandle type="target" />

    <!-- Header with icon -->
    <BaseNodeHeader
      :icon="icon"
      :label="label"
      :subtext="subtext"
      :icon-bg-color="iconBgColor"
      :icon-border-color="iconBorderColor"
      :icon-text-color="iconTextColor"
    />

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

    <!-- Two source handles: success and error -->
    <BaseNodeHandle
      type="source"
      :handles="[
        { id: 'success', label: 'Success', position: Position.Right },
        { id: 'error', label: 'Error', position: Position.Right },
      ]"
    />
  </BaseNode>
</template>
