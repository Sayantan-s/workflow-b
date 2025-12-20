<script setup lang="ts">
import { watch } from "vue";
import { useForm, useField } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { z } from "zod";
import type { DelayLogicData, DelayUnit } from "@/types/workflow";
import { useWorkflowStore } from "@/stores/workflow";

interface Props {
  nodeId: string;
  data: DelayLogicData;
}

const props = defineProps<Props>();

const workflowStore = useWorkflowStore();

// Zod validation schema
const delayConfigSchema = z.object({
  delayValue: z.number().min(1, "Value must be at least 1").max(9999, "Value must be 9999 or less"),
  delayUnit: z.string(),
});

const { errors, setValues } = useForm({
  validationSchema: toTypedSchema(delayConfigSchema),
  initialValues: {
    delayValue: props.data.delayValue,
    delayUnit: props.data.delayUnit,
  },
});

// Field bindings
const { value: delayValue } = useField<number>("delayValue");
const { value: delayUnit } = useField<DelayUnit>("delayUnit");

const unitOptions = [
  { value: "seconds", label: "Seconds" },
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
];

// Sync form with props when data changes
watch(
  () => props.data,
  (data) => {
    setValues({
      delayValue: data.delayValue,
      delayUnit: data.delayUnit,
    });
  },
  { immediate: true }
);

// Auto-save on field changes
watch(
  [delayValue, delayUnit],
  ([newValue, newUnit]) => {
    const hasNoErrors = Object.keys(errors.value).length === 0;
    workflowStore.updateNodeData(props.nodeId, {
      delayValue: newValue,
      delayUnit: newUnit,
      isValid: hasNoErrors && newValue > 0,
    });
  }
);
</script>

<template>
  <div class="space-y-4">
    <!-- Delay Duration -->
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-gray-600">
        Delay Duration <span class="text-red-500">*</span>
      </label>
      <NumberInput
        v-model="delayValue"
        size="sm"
        :min="1"
        :max="9999"
        :step="1"
        :error="errors.delayValue"
      />
    </div>

    <!-- Unit -->
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-gray-600">
        Unit <span class="text-red-500">*</span>
      </label>
      <Select
        v-model="delayUnit"
        size="sm"
        :options="unitOptions"
        placeholder="Select unit"
        :error="!!errors.delayUnit"
      />
    </div>

    <!-- Preview -->
    <div class="p-3 bg-amber-50 rounded-lg border border-amber-200">
      <p class="text-xs text-amber-700">
        The workflow will wait for
        <span class="font-semibold">{{ delayValue }} {{ delayUnit }}</span>
        before continuing.
      </p>
    </div>
  </div>
</template>

