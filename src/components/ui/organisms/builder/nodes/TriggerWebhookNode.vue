<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { WebhookTriggerData } from '@/types/workflow'
import BaseNode from './BaseNode.vue'

interface Props extends NodeProps {
  data: WebhookTriggerData
}

const props = defineProps<Props>()
</script>

<template>
  <BaseNode
    v-bind="$props"
    icon="🔗"
    color="#22c55e"
    :has-target-handle="false"
  >
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
          {{ props.data.webhookUrl || 'No URL set' }}
        </span>
      </div>
      <div v-if="props.data.auth.type !== 'none'" class="text-[10px] text-gray-400">
        🔒 {{ props.data.auth.type }}
      </div>
    </div>
  </BaseNode>
</template>

