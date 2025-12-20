<script setup lang="ts">
import { computed } from "vue";
import { Check, ChevronDown, ChevronUp } from "lucide-vue-next";
import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectLabel,
  SelectPortal,
  SelectRoot,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from "reka-ui";

type SelectSize = "sm" | "md" | "lg";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectGroupOption {
  label: string;
  options: SelectOption[];
}

interface Props {
  modelValue?: string;
  placeholder?: string;
  options?: SelectOption[] | SelectGroupOption[];
  disabled?: boolean;
  error?: boolean;
  size?: SelectSize;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "Select an option...",
  options: () => [],
  size: "md",
  disabled: false,
  error: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

// Check if options are grouped
const isGrouped = computed(() => {
  if (props.options.length === 0) return false;
  const first = props.options[0];
  return first && "options" in first;
});

// Type-safe computed for grouped options
const groupedOptions = computed(() => props.options as SelectGroupOption[]);

// Type-safe computed for flat options
const flatOptions = computed(() => props.options as SelectOption[]);

const sizes: Record<SelectSize, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-3 text-sm",
  lg: "h-11 px-4 text-base",
};

const triggerClasses = computed(() => [
  "inline-flex w-full items-center justify-between rounded-lg border bg-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed data-[placeholder]:text-gray-400",
  sizes[props.size],
  props.error
    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
    : "border-gray-300 hover:border-gray-400 focus:border-indigo-500 focus:ring-indigo-200",
]);

const itemClasses =
  "text-sm text-gray-900 rounded-md flex items-center h-9 pr-9 pl-8 relative select-none cursor-pointer data-[disabled]:text-gray-400 data-[disabled]:pointer-events-none data-[highlighted]:outline-none data-[highlighted]:bg-indigo-50 data-[highlighted]:text-indigo-900";
</script>

<template>
  <SelectRoot
    :model-value="modelValue"
    :disabled="disabled"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <SelectTrigger :class="triggerClasses">
      <SelectValue :placeholder="placeholder" />
      <ChevronDown class="size-4 text-gray-400 shrink-0" />
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        class="min-w-(--reka-select-trigger-width) bg-white rounded-lg border border-gray-200 shadow-lg z-50 overflow-hidden"
        :side-offset="4"
        position="popper"
      >
        <SelectScrollUpButton
          class="flex items-center justify-center h-6 bg-white text-gray-500 cursor-default border-b border-gray-100"
        >
          <ChevronUp class="size-4" />
        </SelectScrollUpButton>

        <SelectViewport class="p-1">
          <!-- Grouped options -->
          <template v-if="isGrouped">
            <template
              v-for="(group, groupIndex) in groupedOptions"
              :key="groupIndex"
            >
              <SelectSeparator
                v-if="groupIndex > 0"
                class="h-px bg-gray-100 my-1"
              />
              <SelectLabel
                class="px-8 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide"
              >
                {{ group.label }}
              </SelectLabel>
              <SelectGroup>
                <SelectItem
                  v-for="option in group.options"
                  :key="option.value"
                  :value="option.value"
                  :disabled="option.disabled"
                  :class="itemClasses"
                >
                  <SelectItemIndicator
                    class="absolute left-2 inline-flex items-center justify-center"
                  >
                    <Check class="size-4 text-indigo-600" />
                  </SelectItemIndicator>
                  <SelectItemText>{{ option.label }}</SelectItemText>
                </SelectItem>
              </SelectGroup>
            </template>
          </template>

          <!-- Flat options -->
          <template v-else>
            <SelectGroup>
              <SelectItem
                v-for="option in flatOptions"
                :key="option.value"
                :value="option.value"
                :disabled="option.disabled"
                :class="itemClasses"
              >
                <SelectItemIndicator
                  class="absolute left-2 inline-flex items-center justify-center"
                >
                  <Check class="size-4 text-indigo-600" />
                </SelectItemIndicator>
                <SelectItemText>{{ option.label }}</SelectItemText>
              </SelectItem>
            </SelectGroup>
          </template>
        </SelectViewport>

        <SelectScrollDownButton
          class="flex items-center justify-center h-6 bg-white text-gray-500 cursor-default border-t border-gray-100"
        >
          <ChevronDown class="size-4" />
        </SelectScrollDownButton>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
