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
  activeNode.value?.data.type === WorkflowNodeType.TRIGGER_WEBHOOK
    ? (activeNode.value.data as WebhookTriggerData)
    : null
);
const httpData = computed(() =>
  activeNode.value?.data.type === WorkflowNodeType.ACTION_HTTP
    ? (activeNode.value.data as HttpActionData)
    : null
);
const emailData = computed(() =>
  activeNode.value?.data.type === WorkflowNodeType.ACTION_EMAIL
    ? (activeNode.value.data as EmailActionData)
    : null
);
const smsData = computed(() =>
  activeNode.value?.data.type === WorkflowNodeType.ACTION_SMS
    ? (activeNode.value.data as SmsActionData)
    : null
);
const ifElseData = computed(() =>
  activeNode.value?.data.type === WorkflowNodeType.LOGIC_IF_ELSE
    ? (activeNode.value.data as IfElseLogicData)
    : null
);
const delayData = computed(() =>
  activeNode.value?.data.type === WorkflowNodeType.LOGIC_DELAY
    ? (activeNode.value.data as DelayLogicData)
    : null
);
const manualTriggerData = computed(() =>
  activeNode.value?.data.type === WorkflowNodeType.TRIGGER_MANUAL
    ? (activeNode.value.data as ManualTriggerData)
    : null
);

// Get node definition for icon and color
const nodeDefinition = computed(() => {
  if (!activeNode.value) return null;
  return NODE_DEFINITIONS.find((n) => n.type === activeNode.value?.data.type);
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

function getSelectValue(event: Event): string {
  return (event.target as HTMLSelectElement).value;
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
              :value="activeNode.data.label"
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
          <template v-if="webhookData">
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-600"
                >Webhook URL</label
              >
              <input
                :value="webhookData.webhookUrl"
                type="url"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="https://example.com/webhook"
                @input="updateField('webhookUrl', getInputValue($event))"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-600">Method</label>
              <select
                :value="webhookData.method"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                @change="updateField('method', getSelectValue($event))"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </template>

          <template v-else-if="httpData">
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-600">URL</label>
              <input
                :value="httpData.url"
                type="url"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="https://api.example.com/endpoint"
                @input="updateField('url', getInputValue($event))"
              />
              <p class="text-[10px] text-gray-400">
                Use &#123;&#123;variable&#125;&#125; for dynamic values
              </p>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-gray-600">Method</label>
                <select
                  :value="httpData.method"
                  class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  @change="updateField('method', getSelectValue($event))"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-gray-600"
                  >Timeout (s)</label
                >
                <input
                  :value="httpData.timeout"
                  type="number"
                  min="1"
                  max="300"
                  class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  @input="
                    updateField(
                      'timeout',
                      parseInt(getInputValue($event)) || 30
                    )
                  "
                />
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-600">Body Type</label>
              <div class="flex gap-2">
                <button
                  class="flex-1 px-3 py-1.5 text-xs rounded-md transition-colors"
                  :class="
                    httpData.bodyType === 'json'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600'
                  "
                  @click="updateField('bodyType', 'json')"
                >
                  JSON
                </button>
                <button
                  class="flex-1 px-3 py-1.5 text-xs rounded-md transition-colors"
                  :class="
                    httpData.bodyType === 'raw'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600'
                  "
                  @click="updateField('bodyType', 'raw')"
                >
                  Raw
                </button>
              </div>
            </div>
          </template>

          <template v-else-if="emailData">
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-600">To</label>
              <input
                :value="emailData.recipients?.to?.join(', ')"
                type="text"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="email@example.com, ..."
                @input="
                  updateField('recipients', {
                    ...emailData.recipients,
                    to: getInputValue($event)
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                "
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-600">Subject</label>
              <input
                :value="emailData.subject"
                type="text"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Email subject"
                @input="updateField('subject', getInputValue($event))"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-600">Body</label>
              <textarea
                :value="emailData.body"
                rows="4"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="Email body content"
                @input="updateField('body', getTextAreaValue($event))"
              />
            </div>
          </template>

          <template v-else-if="smsData">
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-600">To Number</label>
              <input
                :value="smsData.toNumber"
                type="tel"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="+1234567890"
                @input="updateField('toNumber', getInputValue($event))"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-600">
                Message
                <span class="text-gray-400 font-normal"
                  >({{ smsData.message?.length || 0 }}/160)</span
                >
              </label>
              <textarea
                :value="smsData.message"
                rows="3"
                maxlength="160"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="SMS message"
                @input="updateField('message', getTextAreaValue($event))"
              />
            </div>
          </template>

          <template v-else-if="delayData">
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-600"
                >Delay Duration</label
              >
              <div class="flex gap-2">
                <input
                  :value="delayData.delayValue"
                  type="number"
                  min="1"
                  class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  @input="
                    updateField(
                      'delayValue',
                      parseInt(getInputValue($event)) || 1
                    )
                  "
                />
                <select
                  :value="delayData.delayType"
                  class="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  @change="updateField('delayType', getSelectValue($event))"
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
          </template>

          <template v-else-if="manualTriggerData">
            <div class="p-4 bg-green-50 rounded-lg border border-green-200">
              <p class="text-xs text-green-700">
                This trigger starts the workflow manually when you click the Run
                button.
              </p>
            </div>
          </template>

          <template v-else-if="ifElseData">
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-gray-600">Condition</label>
              <p class="text-[10px] text-gray-400 mb-2">
                Define when to follow the True or False branch
              </p>
              <div class="space-y-2">
                <input
                  :value="ifElseData.conditions?.[0]?.field"
                  type="text"
                  class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Field name (e.g., response.status)"
                  @input="
                    updateField('conditions', [
                      {
                        ...ifElseData.conditions?.[0],
                        field: getInputValue($event),
                      },
                    ])
                  "
                />
                <select
                  :value="ifElseData.conditions?.[0]?.operator"
                  class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  @change="
                    updateField('conditions', [
                      {
                        ...ifElseData.conditions?.[0],
                        operator: getSelectValue($event),
                      },
                    ])
                  "
                >
                  <option value="equals">Equals</option>
                  <option value="notEquals">Not Equals</option>
                  <option value="contains">Contains</option>
                  <option value="gt">Greater Than</option>
                  <option value="lt">Less Than</option>
                  <option value="isEmpty">Is Empty</option>
                </select>
                <input
                  :value="ifElseData.conditions?.[0]?.value"
                  type="text"
                  class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Value to compare"
                  @input="
                    updateField('conditions', [
                      {
                        ...ifElseData.conditions?.[0],
                        value: getInputValue($event),
                      },
                    ])
                  "
                />
              </div>
            </div>
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
