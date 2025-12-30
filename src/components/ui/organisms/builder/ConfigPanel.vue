<script setup lang="ts">
import { computed, watch, ref } from "vue";
import { Panel } from "@vue-flow/core";
import { useWorkflowStore } from "@/stores/workflow";
import {
  NODE_DEFINITIONS,
  WorkflowNodeType,
  type WebhookTriggerData,
  type HttpActionData,
  type EmailActionData,
  type SmsActionData,
  type IfElseLogicData,
  type DelayLogicData,
  type ManualTriggerData,
  type TransformLogicData,
} from "@/types/workflow";
import TransformNodeConfig from "./config/TransformNodeConfig.vue";

const workflowStore = useWorkflowStore();

const activeNode = computed(() => workflowStore.activeNode);
const isOpen = computed(() => activeNode.value !== null);

// Type-safe data getters
const webhookData = computed(() =>
  activeNode?.value?.data?.type === WorkflowNodeType.TRIGGER_WEBHOOK
    ? (activeNode.value.data as WebhookTriggerData)
    : null
);
const httpData = computed(() =>
  activeNode?.value?.data?.type === WorkflowNodeType.ACTION_HTTP
    ? (activeNode.value.data as HttpActionData)
    : null
);
const emailData = computed(() =>
  activeNode?.value?.data?.type === WorkflowNodeType.ACTION_EMAIL
    ? (activeNode.value.data as EmailActionData)
    : null
);
const smsData = computed(() =>
  activeNode?.value?.data?.type === WorkflowNodeType.ACTION_SMS
    ? (activeNode.value.data as SmsActionData)
    : null
);
const ifElseData = computed(() =>
  activeNode?.value?.data?.type === WorkflowNodeType.LOGIC_IF_ELSE
    ? (activeNode.value.data as IfElseLogicData)
    : null
);
const delayData = computed(() =>
  activeNode?.value?.data?.type === WorkflowNodeType.LOGIC_DELAY
    ? (activeNode.value.data as DelayLogicData)
    : null
);
const transformData = computed(() =>
  activeNode?.value?.data?.type === WorkflowNodeType.LOGIC_TRANSFORM
    ? (activeNode.value.data as TransformLogicData)
    : null
);

const activeNodeDefinition = computed(() => {
  if (!activeNode.value) return null;
  return NODE_DEFINITIONS.find((n) => n.type === activeNode.value?.data.type);
});

function closePanel() {
  workflowStore.setActiveNode(null);
}
</script>

<template>
  <Panel position="top-right" class="m-0! z-20!">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-x-full opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="translate-x-full opacity-0"
    >
      <div
        v-if="isOpen && activeNode"
        class="w-80 h-[calc(100vh-2rem)] m-4 bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col overflow-hidden"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50"
        >
          <div class="flex items-center gap-2">
            <span class="text-lg">{{ activeNodeDefinition?.icon }}</span>
            <div>
              <h3 class="text-sm font-semibold text-gray-800">
                {{ activeNodeDefinition?.label }}
              </h3>
              <p class="text-[10px] text-gray-500">
                ID: {{ activeNode.id.slice(0, 8) }}
              </p>
            </div>
          </div>
          <button
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            @click="closePanel"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Configuration Content -->
        <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <!-- Common Node Settings -->
          <div class="mb-6 space-y-3">
            <div>
              <label class="text-xs font-medium text-gray-600">Label</label>
              <Input
                :model-value="activeNode.data.label"
                size="sm"
                class="mt-1"
                @update:model-value="
                  workflowStore.updateNodeData(activeNode.id, { label: $event })
                "
              />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-600"
                >Description</label
              >
              <textarea
                :value="activeNode.data.description"
                class="mt-1 w-full text-xs px-2 py-1.5 rounded-md border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none bg-white text-gray-700 placeholder:text-gray-400"
                rows="2"
                placeholder="Optional description"
                @input="
                  workflowStore.updateNodeData(activeNode.id, {
                    description: ($event.target as HTMLTextAreaElement).value,
                  })
                "
              />
            </div>
          </div>

          <div class="h-px bg-gray-100 my-4" />

          <!-- Specific Node Config -->
          <div>
            <WebhookNodeConfig
              v-if="webhookData"
              :node-id="activeNode.id"
              :data="webhookData"
            />
            <HttpNodeConfig
              v-if="httpData"
              :node-id="activeNode.id"
              :data="httpData"
            />
            <EmailNodeConfig
              v-if="emailData"
              :node-id="activeNode.id"
              :data="emailData"
            />
            <SmsNodeConfig
              v-if="smsData"
              :node-id="activeNode.id"
              :data="smsData"
            />
            <IfElseNodeConfig
              v-if="ifElseData"
              :node-id="activeNode.id"
              :data="ifElseData"
            />
            <DelayNodeConfig
              v-if="delayData"
              :node-id="activeNode.id"
              :data="delayData"
            />
            <TransformNodeConfig
              v-if="transformData"
              :node-id="activeNode.id"
              :data="transformData"
            />

            <div
              v-if="activeNode.data.type === WorkflowNodeType.TRIGGER_MANUAL"
              class="text-xs text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200"
            >
              No additional configuration needed.
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <div class="flex items-center justify-between text-xs">
            <span
              class="flex items-center gap-1.5"
              :class="
                activeNode.data.isValid ? 'text-green-600' : 'text-amber-600'
              "
            >
              <div
                class="w-1.5 h-1.5 rounded-full"
                :class="
                  activeNode.data.isValid ? 'bg-green-500' : 'bg-amber-500'
                "
              />
              {{ activeNode.data.isValid ? "Ready" : "Incomplete" }}
            </span>
            <button
              class="text-red-500 hover:text-red-600 font-medium"
              @click="workflowStore.removeNodes([activeNode.id])"
            >
              Delete Node
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Panel>
</template>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 3px;
}
</style>
