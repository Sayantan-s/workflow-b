<script setup lang="ts">
import { computed } from "vue";
import type { NodeProps } from "@vue-flow/core";
import type { EmailActionData } from "@/types/workflow";
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
  data: EmailActionData;
}

const props = defineProps<Props>();

const label = computed(() => props.data.label || getNodeLabel(props.data.type));
const icon = computed(() => getNodeIcon(props.data.type));
const nodeColor = computed(() => getNodeColor(props.data.type));
const subtext = computed(() => getNodeSubtext(props.data.type));
const iconBgColor = computed(() => getNodeIconBgColor(props.data.type));
const iconBorderColor = computed(() => getNodeIconBorderColor(props.data.type));
const iconTextColor = computed(() => getNodeIconTextColor(props.data.type));

const recipientCount = computed(() => {
  const { to, cc, bcc } = props.data.recipients;
  return to.length + cc.length + bcc.length;
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
      <div class="space-y-1">
        <div class="text-xs text-gray-600 truncate max-w-[160px]">
          {{ props.data.subject || "No subject" }}
        </div>
        <div class="flex items-center gap-2 text-[10px] text-gray-400">
          <span
            >👤 {{ recipientCount }} recipient{{
              recipientCount !== 1 ? "s" : ""
            }}</span
          >
          <span class="capitalize">{{ props.data.bodyFormat }}</span>
          <span v-if="props.data.attachments.length > 0">
            📎 {{ props.data.attachments.length }}
          </span>
        </div>
      </div>
    </BaseNodeContent>

    <BaseNodeHandle type="source" />
  </BaseNode>
</template>
