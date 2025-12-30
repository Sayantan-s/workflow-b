<script setup lang="ts">
import { watch } from "vue";
import { useForm, useField } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { z } from "zod";
import type { HttpActionData, HttpMethod } from "@/types/workflow";
import { useWorkflowStore } from "@/stores/workflow";

interface Props {
  nodeId: string;
  data: HttpActionData;
}

const props = defineProps<Props>();

const workflowStore = useWorkflowStore();

// Zod validation schema
// Allow URLs with variables ({{ variableName }}) - will be resolved at runtime
const httpConfigSchema = z.object({
  url: z
    .string()
    .min(1, "URL is required")
    .refine(
      (val) => {
        // If it contains variables, skip URL validation (will be validated after resolution)
        if (val.includes("{{")) return true;
        // Otherwise, validate as URL
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Please enter a valid URL" }
    ),
  method: z.string(),
  timeout: z.number().min(1).max(300),
  headers: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
  body: z.string().optional(),
});

const { errors, setValues } = useForm({
  validationSchema: toTypedSchema(httpConfigSchema),
  initialValues: {
    url: props.data.url,
    method: props.data.method,
    timeout: props.data.timeout,
    headers: [] as { key: string; value: string }[],
    body: props.data.body || "{}",
  },
});

// Field bindings
const { value: url, setValue: setUrl } = useField<string>("url");
const { value: method } = useField<HttpMethod>("method");
const { value: timeout } = useField<number>("timeout");
const { value: headers } =
  useField<{ key: string; value: string }[]>("headers");
const { value: body } = useField<string>("body");

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
      url: data.url,
      method: data.method,
      timeout: data.timeout,
      headers: [],
      body: data.body || "{}",
    });
  },
  { immediate: true }
);

// Auto-save on field changes
watch(
  [url, method, timeout, body],
  ([newUrl, newMethod, newTimeout, newBody]) => {
    // Skip validation for URL if it contains variables (will be resolved at runtime)
    const urlHasVariables = typeof newUrl === "string" && newUrl.includes("{{");
    const hasNoErrors =
      Object.keys(errors.value).length === 0 ||
      (urlHasVariables && !errors.value.url);

    workflowStore.updateNodeData(props.nodeId, {
      url: newUrl,
      method: newMethod,
      timeout: newTimeout,
      body: newBody,
      isValid: hasNoErrors && !!newUrl,
    });
  },
  { immediate: false }
);

// Handle URL updates from VariableInput
function handleUrlUpdate(newUrl: string) {
  console.log("[HttpNodeConfig] URL updated:", newUrl);
  setUrl(newUrl);
  // Manually trigger save since watch might not catch the change immediately
  workflowStore.updateNodeData(props.nodeId, {
    url: newUrl,
  });
  console.log(
    "[HttpNodeConfig] Saved to store. Current node data:",
    workflowStore.nodes.find((n) => n.id === props.nodeId)?.data
  );
}

// Handle body updates from VariableInput
function handleBodyUpdate(newBody: string) {
  body.value = newBody;
}
</script>

<template>
  <div class="space-y-4">
    <!-- URL -->
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-gray-600">
        URL <span class="text-red-500">*</span>
      </label>
      <VariableInput
        :model-value="url"
        :node-id="props.nodeId"
        size="sm"
        type="text"
        placeholder="https://api.example.com/endpoint or https://api.example.com/{{ variableName }}"
        :error="errors.url"
        @update:model-value="handleUrlUpdate"
      />
      <p v-if="!errors.url" class="text-[10px] text-gray-400">
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

    <!-- Timeout -->
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-gray-600">
        Timeout (seconds)
      </label>
      <NumberInput
        v-model="timeout"
        size="sm"
        :min="1"
        :max="300"
        :step="5"
        :error="errors.timeout"
      />
    </div>

    <!-- Headers -->
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-gray-600">Headers</label>
      <KeyValueInput
        v-model="headers"
        :node-id="props.nodeId"
        key-placeholder="Header name"
        value-placeholder="Header value"
      />
    </div>

    <!-- Body -->
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-gray-600">
        Request Body (JSON)
      </label>
      <VariableInput
        :model-value="body"
        :node-id="props.nodeId"
        size="sm"
        type="textarea"
        placeholder='{"key": "value"} or {"key": "{{ variableName }}"}'
        :error="errors.body"
        @update:model-value="handleBodyUpdate"
      />
      <p v-if="!errors.body" class="text-[10px] text-gray-400">
        Type &#123;&#123; to see available variables
      </p>
    </div>
  </div>
</template>
