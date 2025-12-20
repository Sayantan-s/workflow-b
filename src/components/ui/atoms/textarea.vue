<script setup lang="ts">
import { computed } from "vue";

type TextareaVariant = "default" | "filled" | "flushed";
type TextareaSize = "sm" | "md" | "lg";

interface Props {
  modelValue?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  variant?: TextareaVariant;
  size?: TextareaSize;
  rows?: number;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "default",
  size: "md",
  rows: 3,
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const variants: Record<TextareaVariant, string> = {
  default:
    "border border-gray-300 rounded-lg bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200",
  filled:
    "border-0 rounded-lg bg-gray-100 focus:bg-gray-50 focus:ring-2 focus:ring-indigo-200",
  flushed:
    "border-0 border-b-2 border-gray-300 rounded-none bg-transparent focus:border-indigo-500 px-0!",
};

const sizes: Record<TextareaSize, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-3 text-base",
};

const hasError = computed(() => !!props.error);

const textareaClasses = computed(() => [
  "w-full text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-y",
  variants[props.variant],
  sizes[props.size],
  hasError.value
    ? "border-red-500! focus:border-red-500! focus:ring-red-200!"
    : "",
]);

function handleInput(event: Event) {
  emit("update:modelValue", (event.target as HTMLTextAreaElement).value);
}
</script>

<template>
  <div class="w-full">
    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="rows"
      :class="textareaClasses"
      @input="handleInput"
    />
    <p v-if="error" class="mt-1.5 text-xs text-red-600">
      {{ error }}
    </p>
  </div>
</template>
