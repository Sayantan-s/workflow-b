<script setup lang="ts">
import { computed } from "vue";

type InputVariant = "default" | "filled" | "flushed";
type InputSize = "sm" | "md" | "lg";

interface Props {
  modelValue?: string | number;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  variant?: InputVariant;
  size?: InputSize;
}

const props = withDefaults(defineProps<Props>(), {
  type: "text",
  variant: "default",
  size: "md",
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const variants: Record<InputVariant, string> = {
  default:
    "border border-gray-300 rounded-lg bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200",
  filled:
    "border-0 rounded-lg bg-gray-100 focus:bg-gray-50 focus:ring-2 focus:ring-indigo-200",
  flushed:
    "border-0 border-b-2 border-gray-300 rounded-none bg-transparent focus:border-indigo-500 px-0!",
};

const sizes: Record<InputSize, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-3 text-sm",
  lg: "h-11 px-4 text-base",
};

const hasError = computed(() => !!props.error);

const inputClasses = computed(() => [
  "w-full text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
  variants[props.variant],
  sizes[props.size],
  hasError.value
    ? "border-red-500! focus:border-red-500! focus:ring-red-200!"
    : "",
]);

function handleInput(event: Event) {
  emit("update:modelValue", (event.target as HTMLInputElement).value);
}
</script>

<template>
  <div class="w-full">
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="inputClasses"
      @input="handleInput"
    />
    <p v-if="error" class="mt-1.5 text-xs text-red-600">
      {{ error }}
    </p>
  </div>
</template>
