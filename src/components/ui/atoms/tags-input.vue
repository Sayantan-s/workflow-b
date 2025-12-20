<script setup lang="ts">
import { computed, ref } from "vue";
import { X } from "lucide-vue-next";
import {
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
  TagsInputRoot,
} from "reka-ui";

type TagsInputSize = "sm" | "md" | "lg";
type ValidationType = "none" | "email";

interface Props {
  modelValue?: string[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  size?: TagsInputSize;
  validation?: ValidationType;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  placeholder: "Add tag...",
  size: "md",
  disabled: false,
  validation: "none",
});

const emit = defineEmits<{
  "update:modelValue": [value: string[]];
}>();

// Local validation error for individual tag
const tagError = ref<string | null>(null);

// Email regex pattern
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Check if a single value is valid (without showing error)
function isValueValid(value: string): boolean {
  if (props.validation === "email") {
    return emailRegex.test(value);
  }
  return true;
}

// Handle adding new tags with validation
function handleAddValue(values: string[]) {
  // Filter ALL values to only include valid ones
  // This syncs reka-ui's internal state with our parent state
  const validValues = values.filter((v) => isValueValid(v));
  const invalidValues = values.filter((v) => !isValueValid(v));

  // Show error if any invalid values were filtered out
  if (invalidValues.length > 0) {
    tagError.value = "Please enter a valid email";
    setTimeout(() => (tagError.value = null), 2000);
  } else {
    tagError.value = null;
  }

  // Always emit valid values - this syncs reka-ui's internal state
  emit("update:modelValue", validValues);
}

// Use explicit event handler instead of computed setter (reka-ui doesn't trigger computed setters)
const tags = computed(() => props.modelValue);

const sizes: Record<
  TagsInputSize,
  { root: string; input: string; tag: string }
> = {
  sm: {
    root: "min-h-8 px-2 py-1 text-xs gap-1",
    input: "text-xs",
    tag: "px-1.5 py-0.5 text-[10px]",
  },
  md: {
    root: "min-h-9 px-2.5 py-1.5 text-sm gap-1.5",
    input: "text-sm",
    tag: "px-2 py-0.5 text-xs",
  },
  lg: {
    root: "min-h-11 px-3 py-2 text-base gap-2",
    input: "text-base",
    tag: "px-2.5 py-1 text-sm",
  },
};

const hasError = computed(() => !!props.error || !!tagError.value);

const rootClasses = computed(() => [
  "flex flex-wrap items-center w-full rounded-lg border bg-white transition-all duration-150 focus-within:ring-2 focus-within:ring-offset-0",
  sizes[props.size].root,
  hasError.value
    ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-200"
    : "border-gray-300 focus-within:border-indigo-500 focus-within:ring-indigo-200",
  props.disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "",
]);

const displayError = computed(() => tagError.value || props.error);
</script>

<template>
  <div class="w-full">
    <TagsInputRoot
      :model-value="tags"
      :disabled="disabled"
      :class="rootClasses"
      @update:model-value="handleAddValue"
    >
      <TagsInputItem
        v-for="tag in tags"
        :key="tag"
        :value="tag"
        class="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 rounded-md"
        :class="sizes[size].tag"
      >
        <TagsInputItemText />
        <TagsInputItemDelete
          class="hover:bg-indigo-200 rounded p-0.5 transition-colors"
        >
          <X class="size-3" />
        </TagsInputItemDelete>
      </TagsInputItem>

      <TagsInputInput
        :placeholder="tags.length === 0 ? placeholder : ''"
        :disabled="disabled"
        :class="[
          'flex-1 min-w-[80px] bg-transparent outline-none placeholder:text-gray-400',
          sizes[size].input,
        ]"
      />
    </TagsInputRoot>

    <p v-if="displayError" class="mt-1.5 text-xs text-red-600">
      {{ displayError }}
    </p>
  </div>
</template>
