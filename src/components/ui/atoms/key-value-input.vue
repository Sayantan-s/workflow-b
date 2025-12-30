<script setup lang="ts">
import { computed } from "vue";
import { Plus, Trash2 } from "lucide-vue-next";
import VariableInput from "./variable-input.vue";

interface KeyValuePair {
  key: string;
  value: string;
}

interface Props {
  modelValue?: KeyValuePair[];
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  disabled?: boolean;
  error?: string;
  nodeId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  keyPlaceholder: "Key",
  valuePlaceholder: "Value",
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: KeyValuePair[]];
}>();

const pairs = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

function addPair() {
  emit("update:modelValue", [...props.modelValue, { key: "", value: "" }]);
}

function removePair(index: number) {
  const newPairs = [...props.modelValue];
  newPairs.splice(index, 1);
  emit("update:modelValue", newPairs);
}

function updatePair(index: number, field: "key" | "value", value: string) {
  const newPairs = [...props.modelValue];
  newPairs[index] = { ...newPairs[index], [field]: value };
  emit("update:modelValue", newPairs);
}
</script>

<template>
  <div class="w-full space-y-2">
    <!-- Existing pairs -->
    <div
      v-for="(pair, index) in pairs"
      :key="index"
      class="flex items-center gap-2"
    >
      <VariableInput
        :model-value="pair.key"
        :node-id="nodeId"
        size="sm"
        type="text"
        :placeholder="keyPlaceholder"
        :disabled="disabled"
        class="flex-1"
        @update:model-value="updatePair(index, 'key', $event)"
      />
      <VariableInput
        :model-value="pair.value"
        :node-id="nodeId"
        size="sm"
        type="text"
        :placeholder="valuePlaceholder"
        :disabled="disabled"
        class="flex-1"
        @update:model-value="updatePair(index, 'value', $event)"
      />
      <button
        type="button"
        :disabled="disabled"
        class="flex items-center justify-center size-9 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
        @click="removePair(index)"
      >
        <Trash2 class="size-4" />
      </button>
    </div>

    <!-- Add button -->
    <button
      type="button"
      :disabled="disabled"
      class="flex items-center gap-2 px-3 h-9 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
      @click="addPair"
    >
      <Plus class="size-4" />
      Add header
    </button>

    <p v-if="error" class="mt-1.5 text-xs text-red-600">
      {{ error }}
    </p>
  </div>
</template>

