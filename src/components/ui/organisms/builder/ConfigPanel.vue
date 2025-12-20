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
} from "@/types/workflow";

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
const manualTriggerData = computed(() =>
  activeNode?.value?.data?.type === WorkflowNodeType.TRIGGER_MANUAL
    ? (activeNode.value.data as ManualTriggerData)
    : null
);

// Get node definition for icon and color
const nodeDefinition = computed(() => {
  if (!activeNode.value) return null;
  return NODE_DEFINITIONS.find((n) => n.type === activeNode.value?.data?.type);
});

// Local form state (synced with store)
const formData = ref<Record<string, unknown>>({});

watch(
  activeNode,
  (node) => {
    if (node) {
      formData.value = { ...node.data };
    } else {
      formData.value = {};
    }
  },
  { immediate: true, deep: true }
);

function updateField(field: string, value: unknown) {
  if (!activeNode.value) return;
  formData.value[field] = value;
  workflowStore.updateNodeData(activeNode.value.id, { [field]: value });
}

function getInputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

function getTextAreaValue(event: Event): string {
  return (event.target as HTMLTextAreaElement).value;
}

function closePanel() {
  workflowStore.setActiveNode(null);
}

function deleteNode() {
  if (!activeNode.value) return;
  workflowStore.removeNodes([activeNode.value.id]);
}
</script>

<template>
  <Panel position="top-right" class="m-0!">
    <Transition
      enter-active-class="transition-transform duration-200 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-150 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="isOpen && activeNode"
        class="w-80 h-screen bg-white/95 backdrop-blur-sm border-l border-gray-200 overflow-y-auto shadow-xl"
      >
        <!-- Header -->
        <div
          class="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-10"
          :style="{
            borderTopColor: nodeDefinition?.color,
            borderTopWidth: '3px',
          }"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xl">{{ nodeDefinition?.icon }}</span>
              <div>
                <h2 class="text-sm font-bold text-gray-800">Configure Node</h2>
                <p class="text-xs text-gray-500">{{ nodeDefinition?.label }}</p>
              </div>
            </div>
            <button
              class="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              @click="closePanel"
            >
              <svg
                class="w-4 h-4 text-gray-500"
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
        </div>

        <!-- Form Content -->
        <div class="p-4 space-y-4">
          <!-- Label -->
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-gray-600">Label</label>
            <input
              :value="activeNode?.data?.label"
              type="text"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              placeholder="Node label"
              @input="updateField('label', getInputValue($event))"
            />
          </div>

          <!-- Description -->
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-gray-600">Description</label>
            <textarea
              :value="activeNode?.data?.description || ''"
              rows="2"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow resize-none"
              placeholder="Optional description"
              @input="updateField('description', getTextAreaValue($event))"
            />
          </div>

          <hr class="border-gray-100" />

          <!-- Type-specific fields -->
          <template v-if="webhookData && activeNode">
            <WebhookNodeConfig :node-id="activeNode.id" :data="webhookData" />
          </template>

          <template v-else-if="httpData && activeNode">
            <HttpNodeConfig :node-id="activeNode.id" :data="httpData" />
          </template>

          <template v-else-if="emailData && activeNode">
            <EmailNodeConfig :node-id="activeNode.id" :data="emailData" />
          </template>

          <template v-else-if="smsData && activeNode">
            <SmsNodeConfig :node-id="activeNode.id" :data="smsData" />
          </template>

          <template v-else-if="delayData && activeNode">
            <DelayNodeConfig :node-id="activeNode.id" :data="delayData" />
          </template>

          <template v-else-if="manualTriggerData">
            <div class="p-4 bg-green-50 rounded-lg border border-green-200">
              <p class="text-xs text-green-700">
                This trigger starts the workflow manually when you click the Run
                button.
              </p>
            </div>
          </template>

          <template v-else-if="ifElseData && activeNode">
            <IfElseNodeConfig :node-id="activeNode.id" :data="ifElseData" />
          </template>
        </div>

        <!-- Footer Actions -->
        <div
          class="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3"
        >
          <button
            class="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            @click="deleteNode"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete Node
          </button>
        </div>
      </aside>
    </Transition>
  </Panel>
</template>

<style scoped>
aside {
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;
}

aside::-webkit-scrollbar {
  width: 6px;
}

aside::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 3px;
}
</style>
