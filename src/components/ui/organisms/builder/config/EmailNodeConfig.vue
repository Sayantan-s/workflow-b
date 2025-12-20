<script setup lang="ts">
import { watch, ref } from "vue";
import { useForm, useField } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { z } from "zod";
import { ChevronDown, ChevronUp } from "lucide-vue-next";
import type { EmailActionData } from "@/types/workflow";
import { useWorkflowStore } from "@/stores/workflow";

interface Props {
  nodeId: string;
  data: EmailActionData;
}

const props = defineProps<Props>();

const workflowStore = useWorkflowStore();

// Toggle for CC/BCC fields
const showCcBcc = ref(false);

// Zod validation schema
const emailConfigSchema = z.object({
  to: z.array(z.string().email("Invalid email")).min(1, "At least one recipient required"),
  cc: z.array(z.string().email("Invalid email")).optional(),
  bcc: z.array(z.string().email("Invalid email")).optional(),
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
  body: z.string().min(1, "Email body is required"),
});

const { errors, setValues } = useForm({
  validationSchema: toTypedSchema(emailConfigSchema),
  initialValues: {
    to: props.data.recipients?.to || [],
    cc: props.data.recipients?.cc || [],
    bcc: props.data.recipients?.bcc || [],
    subject: props.data.subject,
    body: props.data.body,
  },
});

// Field bindings
const { value: toRecipients } = useField<string[]>("to");
const { value: ccRecipients } = useField<string[]>("cc");
const { value: bccRecipients } = useField<string[]>("bcc");
const { value: subject } = useField<string>("subject");
const { value: body } = useField<string>("body");

// Sync form with props when data changes
watch(
  () => props.data,
  (data) => {
    setValues({
      to: data.recipients?.to || [],
      cc: data.recipients?.cc || [],
      bcc: data.recipients?.bcc || [],
      subject: data.subject,
      body: data.body,
    });
    // Show CC/BCC if they have values
    if ((data.recipients?.cc?.length || 0) > 0 || (data.recipients?.bcc?.length || 0) > 0) {
      showCcBcc.value = true;
    }
  },
  { immediate: true }
);

// Auto-save on field changes
watch(
  [toRecipients, ccRecipients, bccRecipients, subject, body],
  ([newTo, newCc, newBcc, newSubject, newBody]) => {
    const hasNoErrors = Object.keys(errors.value).length === 0;
    workflowStore.updateNodeData(props.nodeId, {
      recipients: {
        to: newTo || [],
        cc: newCc || [],
        bcc: newBcc || [],
      },
      subject: newSubject,
      body: newBody,
      isValid: hasNoErrors && (newTo?.length || 0) > 0 && !!newSubject,
    });
  }
);
</script>

<template>
  <div class="space-y-4">
    <!-- To Recipients -->
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-gray-600">
        To <span class="text-red-500">*</span>
      </label>
      <TagsInput
        v-model="toRecipients"
        size="sm"
        placeholder="Enter email and press Enter"
        validation="email"
        :error="errors.to"
      />
    </div>

    <!-- CC/BCC Toggle -->
    <button
      type="button"
      class="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 transition-colors"
      @click="showCcBcc = !showCcBcc"
    >
      <component :is="showCcBcc ? ChevronUp : ChevronDown" class="size-3" />
      {{ showCcBcc ? "Hide" : "Add" }} Cc/Bcc
    </button>

    <!-- CC Recipients -->
    <div v-if="showCcBcc" class="space-y-1.5">
      <label class="text-xs font-medium text-gray-600">Cc</label>
      <TagsInput
        v-model="ccRecipients"
        size="sm"
        placeholder="Carbon copy recipients"
        validation="email"
        :error="errors.cc"
      />
    </div>

    <!-- BCC Recipients -->
    <div v-if="showCcBcc" class="space-y-1.5">
      <label class="text-xs font-medium text-gray-600">Bcc</label>
      <TagsInput
        v-model="bccRecipients"
        size="sm"
        placeholder="Blind carbon copy recipients"
        validation="email"
        :error="errors.bcc"
      />
    </div>

    <!-- Subject -->
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-gray-600">
        Subject <span class="text-red-500">*</span>
      </label>
      <Input
        v-model="subject"
        size="sm"
        placeholder="Email subject line"
        :error="errors.subject"
      />
      <p v-if="!errors.subject" class="text-[10px] text-gray-400">
        Use &#123;&#123;variable&#125;&#125; for dynamic values
      </p>
    </div>

    <!-- Body (Rich Text Editor) -->
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-gray-600">
        Body <span class="text-red-500">*</span>
      </label>
      <Rte
        v-model="body"
        placeholder="Compose your email..."
        height="180px"
        :error="errors.body"
      />
    </div>
  </div>
</template>

