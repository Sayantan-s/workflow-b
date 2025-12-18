<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { ManualTriggerData } from '@/types/workflow'
import BaseNode from './BaseNode.vue'

interface Props extends NodeProps {
  data: ManualTriggerData
}

defineProps<Props>()
</script>

<template>
  <BaseNode
    v-bind="$props"
    icon="▶️"
    color="#22c55e"
    :has-target-handle="false"
  >
    <div class="flex items-center gap-2 text-green-600">
      <span class="text-xs">Click to start workflow</span>
    </div>
  </BaseNode>
</template>

