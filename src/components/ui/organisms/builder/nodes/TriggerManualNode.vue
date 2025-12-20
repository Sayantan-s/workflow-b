<script setup lang="ts">
import type { NodeProps } from "@vue-flow/core";
import type { ManualTriggerData } from "@/types/workflow";
import { Play } from "lucide-vue-next";
import { computed } from "vue";

interface Props extends NodeProps {
  data: ManualTriggerData;
}

const props = defineProps<Props>();

const label = computed(() => props.data.label || "Manual Trigger");
</script>

<template>
  <BaseNode v-bind="$props" color="#22c55e">
    <!-- No target handle for trigger nodes -->

    <BaseNodeHeader>
      <template #icon>
        <Play />
      </template>
      {{ label }}
    </BaseNodeHeader>

    <BaseNodeContent>
      <div class="flex items-center gap-2 text-green-600">
        <span class="text-xs">Click to start workflow</span>
      </div>
    </BaseNodeContent>

    <BaseNodeHandle type="source" />
  </BaseNode>
</template>
