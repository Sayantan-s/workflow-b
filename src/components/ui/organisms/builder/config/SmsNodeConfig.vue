<script setup lang="ts">
import { watch } from "vue";
import { useForm, useField } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { z } from "zod";
import type { SmsActionData } from "@/types/workflow";
import { useWorkflowStore } from "@/stores/workflow";

interface Props {
  nodeId: string;
  data: SmsActionData;
}

const props = defineProps<Props>();

const workflowStore = useWorkflowStore();

// Phone number regex (E.164 format)
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

// Zod validation schema
const smsConfigSchema = z.object({
  fromNumber: z.string().regex(phoneRegex, "Please enter a valid phone number (e.g., +1234567890)"),
  toNumber: z.string().regex(phoneRegex, "Please enter a valid phone number (e.g., +1234567890)"),
  message: z.string().min(1, "Message is required").max(160, "Message must be 160 characters or less"),
});

const { errors, setValues } = useForm({
  validationSchema: toTypedSchema(smsConfigSchema),
  initialValues: {
    fromNumber: props.data.fromNumber,
    toNumber: props.data.toNumber,
    message: props.data.message,
  },
});

// Field bindings
const { value: fromNumber } = useField<string>("fromNumber");
const { value: toNumber } = useField<string>("toNumber");
const { value: message } = useField<string>("message");

// Sync form with props when data changes
watch(
  () => props.data,
  (data) => {
    setValues({
      fromNumber: data.fromNumber,
      toNumber: data.toNumber,
      message: data.message,
    });
  },
  { immediate: true }
);

// Handle field updates from VariableInput
function handleFromNumberUpdate(newFrom: string) {
  fromNumber.value = newFrom;
}

function handleToNumberUpdate(newTo: string) {
  toNumber.value = newTo;
}

function handleMessageUpdate(newMessage: string) {
  message.value = newMessage;
}

// Auto-save on field changes
watch(
  [fromNumber, toNumber, message],
  ([newFrom, newTo, newMessage]) => {
    const hasNoErrors = Object.keys(errors.value).length === 0;
    workflowStore.updateNodeData(props.nodeId, {
      fromNumber: newFrom,
      toNumber: newTo,
      message: newMessage,
      isValid: hasNoErrors && !!newFrom && !!newTo && !!newMessage,
    });
  }
);
</script>

<template>
  <div class="space-y-4">
    <!-- From Number -->
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-gray-600">
        From <span class="text-red-500">*</span>
      </label>
      <VariableInput
        :model-value="fromNumber"
        :node-id="props.nodeId"
        size="sm"
        type="text"
        placeholder="+1234567890 or {{ phoneNumber }}"
        :error="errors.fromNumber"
        @update:model-value="handleFromNumberUpdate"
      />
      <p v-if="!errors.fromNumber" class="text-[10px] text-gray-400">
        Type &#123;&#123; to see available variables
      </p>
    </div>

    <!-- To Number -->
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-gray-600">
        To <span class="text-red-500">*</span>
      </label>
      <VariableInput
        :model-value="toNumber"
        :node-id="props.nodeId"
        size="sm"
        type="text"
        placeholder="+1234567890 or {{ phoneNumber }}"
        :error="errors.toNumber"
        @update:model-value="handleToNumberUpdate"
      />
      <p v-if="!errors.toNumber" class="text-[10px] text-gray-400">
        Type &#123;&#123; to see available variables
      </p>
    </div>

    <!-- Message -->
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-gray-600">
        Message <span class="text-red-500">*</span>
        <span class="text-gray-400 font-normal ml-1">
          ({{ message?.length || 0 }}/160)
        </span>
      </label>
      <VariableInput
        :model-value="message"
        :node-id="props.nodeId"
        size="sm"
        type="textarea"
        placeholder="Enter your SMS message. Use {{ variableName }} for dynamic values"
        :error="errors.message"
        @update:model-value="handleMessageUpdate"
      />
      <p class="text-[10px] text-gray-400">
        Type &#123;&#123; to see available variables
      </p>
    </div>
  </div>
</template>

