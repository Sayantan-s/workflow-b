<script setup lang="ts">
import { computed } from "vue";
import type { NodeProps } from "@vue-flow/core";
import type { EmailActionData } from "@/types/workflow";
import { Mail } from "lucide-vue-next";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeContent,
  BaseNodeHandle,
} from "./base";

interface Props extends NodeProps {
  data: EmailActionData;
}

const props = defineProps<Props>();

const recipientCount = computed(() => {
  const { to, cc, bcc } = props.data.recipients;
  return to.length + cc.length + bcc.length;
});
</script>

<template>
  <BaseNode v-bind="$props" color="#3b82f6">
    <BaseNodeHandle type="target" />

    <BaseNodeHeader>
      <template #icon>
        <Mail />
      </template>
      Send Email
    </BaseNodeHeader>

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
