<script setup lang="ts">
import { watch } from "vue";
import { useForm, useField } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { z } from "zod";
import type { WebhookTriggerData, HttpMethod } from "@/types/workflow";
import { useWorkflowStore } from "@/stores/workflow";

interface Props {
  nodeId: string;
  data: WebhookTriggerData;
}

const props = defineProps<Props>();

const workflowStore = useWorkflowStore();

// Zod validation schema
const webhookConfigSchema = z.object({
  webhookUrl: z.url("Please enter a valid URL"),
  method: z.string(),
  headers: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
});

const { errors, setValues } = useForm({
  validationSchema: toTypedSchema(webhookConfigSchema),
  initialValues: {
    webhookUrl: props.data.webhookUrl,
    method: props.data.method,
    headers: [] as { key: string; value: string }[],
  },
});

// Field bindings
const { value: webhookUrl } = useField<string>("webhookUrl");
const { value: method } = useField<HttpMethod>("method");
const { value: headers } =
  useField<{ key: string; value: string }[]>("headers");

const methodOptions = [
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "PATCH", label: "PATCH" },
  { value: "DELETE", label: "DELETE" },
];

// Sync form with props when data changes
watch(
  () => props.data,
  (data) => {
    setValues({
      webhookUrl: data.webhookUrl,
      method: data.method,
      headers: [],
    });
  },
  { immediate: true }
);

// Handle webhook URL updates from VariableInput
function handleWebhookUrlUpdate(newUrl: string) {
  webhookUrl.value = newUrl;
}

// Auto-save on field changes
watch([webhookUrl, method], ([newUrl, newMethod]) => {
  const hasNoErrors = Object.keys(errors.value).length === 0;
  workflowStore.updateNodeData(props.nodeId, {
    webhookUrl: newUrl,
    method: newMethod,
    isValid: hasNoErrors && !!newUrl,
  });
});
</script>

<template>
  <div class="space-y-4">
    <!-- Webhook URL -->
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-gray-600">
        Webhook URL <span class="text-red-500">*</span>
      </label>
      <VariableInput
        :model-value="webhookUrl"
        :node-id="props.nodeId"
        size="sm"
        type="text"
        placeholder="https://your-domain.com/webhook"
        :error="errors.webhookUrl"
        @update:model-value="handleWebhookUrlUpdate"
      />
      <p v-if="!errors.webhookUrl" class="text-[10px] text-gray-400">
        Type &#123;&#123; to see available variables
      </p>
    </div>

    <!-- Method -->
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-gray-600">
        Method <span class="text-red-500">*</span>
      </label>
      <Select
        v-model="method"
        size="sm"
        :options="methodOptions"
        placeholder="Select method"
        :error="!!errors.method"
      />
    </div>

    <!-- Headers -->
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-gray-600">
        Expected Headers
      </label>
      <KeyValueInput
        v-model="headers"
        :node-id="props.nodeId"
        key-placeholder="Header name"
        value-placeholder="Expected value"
      />
      <p class="text-[10px] text-gray-400">
        Define headers to validate incoming requests
      </p>
    </div>
  </div>
</template>
