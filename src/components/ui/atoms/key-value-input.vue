<script setup lang="ts">
import { computed } from "vue";
import { Plus, Trash2 } from "lucide-vue-next";

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
      <input
        :value="pair.key"
        :placeholder="keyPlaceholder"
        :disabled="disabled"
        class="flex-1 h-9 px-3 text-sm rounded-lg border border-gray-300 bg-white placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
        @input="updatePair(index, 'key', ($event.target as HTMLInputElement).value)"
      />
      <input
        :value="pair.value"
        :placeholder="valuePlaceholder"
        :disabled="disabled"
        class="flex-1 h-9 px-3 text-sm rounded-lg border border-gray-300 bg-white placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
        @input="updatePair(index, 'value', ($event.target as HTMLInputElement).value)"
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

