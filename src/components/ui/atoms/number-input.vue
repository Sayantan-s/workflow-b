<script setup lang="ts">
import { computed } from "vue";
import { Minus, Plus } from "lucide-vue-next";

type NumberInputSize = "sm" | "md" | "lg";

interface Props {
  modelValue?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  error?: string;
  size?: NumberInputSize;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  min: 0,
  max: 999,
  step: 1,
  size: "md",
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: number];
}>();

const sizes: Record<NumberInputSize, { wrapper: string; button: string; input: string }> = {
  sm: { wrapper: "h-8", button: "w-8 text-xs", input: "w-12 text-xs" },
  md: { wrapper: "h-9", button: "w-9 text-sm", input: "w-14 text-sm" },
  lg: { wrapper: "h-11", button: "w-11 text-base", input: "w-16 text-base" },
};

const canDecrement = computed(() => props.modelValue > props.min);
const canIncrement = computed(() => props.modelValue < props.max);

function decrement() {
  if (canDecrement.value) {
    emit("update:modelValue", Math.max(props.min, props.modelValue - props.step));
  }
}

function increment() {
  if (canIncrement.value) {
    emit("update:modelValue", Math.min(props.max, props.modelValue + props.step));
  }
}

function handleInput(event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value) || props.min;
  emit("update:modelValue", Math.max(props.min, Math.min(props.max, value)));
}

const hasError = computed(() => !!props.error);

const wrapperClasses = computed(() => [
  "inline-flex items-center rounded-lg border overflow-hidden",
  sizes[props.size].wrapper,
  hasError.value ? "border-red-500" : "border-gray-300",
  props.disabled ? "opacity-50 cursor-not-allowed" : "",
]);
</script>

<template>
  <div class="w-full">
    <div :class="wrapperClasses">
      <button
        type="button"
        :disabled="disabled || !canDecrement"
        :class="[
          'flex items-center justify-center bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors border-r border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed',
          sizes[size].button,
        ]"
        @click="decrement"
      >
        <Minus class="size-4" />
      </button>
      <input
        type="number"
        :value="modelValue"
        :min="min"
        :max="max"
        :disabled="disabled"
        :class="[
          'text-center bg-white focus:outline-none disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          sizes[size].input,
        ]"
        @input="handleInput"
      />
      <button
        type="button"
        :disabled="disabled || !canIncrement"
        :class="[
          'flex items-center justify-center bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors border-l border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed',
          sizes[size].button,
        ]"
        @click="increment"
      >
        <Plus class="size-4" />
      </button>
    </div>
    <p v-if="error" class="mt-1.5 text-xs text-red-600">
      {{ error }}
    </p>
  </div>
</template>

