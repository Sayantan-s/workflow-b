<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useVariableAutocomplete } from "@/composables/useVariableAutocomplete";
import { ChevronRight } from "lucide-vue-next";

interface Props {
  modelValue: string;
  nodeId?: string;
  placeholder?: string;
  type?: "text" | "textarea";
  size?: "sm" | "md" | "lg";
  error?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: "text",
  size: "md",
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);
const autocompleteRef = ref<HTMLDivElement | null>(null);

const {
  showAutocomplete,
  autocompletePosition,
  availableVariables,
  selectedIndex,
  showAtPosition,
  hide,
  insertVariable,
  handleKeydown,
} = useVariableAutocomplete(props.nodeId);

// Watch for clicks outside to close autocomplete
function handleClickOutside(event: MouseEvent) {
  if (
    autocompleteRef.value &&
    !autocompleteRef.value.contains(event.target as Node) &&
    inputRef.value &&
    !inputRef.value.contains(event.target as Node)
  ) {
    hide();
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  const newValue = target.value;
  console.log("[VariableInput] Input changed:", newValue);
  emit("update:modelValue", newValue);

  // Show autocomplete if typing {{ }}
  const cursorPosition = target.selectionStart || 0;
  showAtPosition(target, cursorPosition);
}

function handleKeydownWrapper(event: KeyboardEvent) {
  if (inputRef.value) {
    handleKeydown(event, inputRef.value);
  }
}

function selectVariable(variableName: string) {
  if (inputRef.value) {
    const oldValue = inputRef.value.value;
    insertVariable(inputRef.value, variableName);
    // Ensure the emit happens after the DOM update
    setTimeout(() => {
      if (inputRef.value) {
        const newValue = inputRef.value.value;
        console.log(
          "[VariableInput] Variable selected:",
          variableName,
          "Value changed:",
          oldValue,
          "->",
          newValue
        );
        emit("update:modelValue", newValue);
      }
    }, 0);
  }
}

function handleFocus(event: FocusEvent) {
  if (inputRef.value && event.target) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const cursorPos = target.selectionStart || 0;
    showAtPosition(target, cursorPos);
  }
}

// Watch for {{ }} pattern to show hint
const showVariableHint = ref(false);
watch(
  () => props.modelValue,
  (value) => {
    if (value && value.includes("{{")) {
      showVariableHint.value = true;
    } else {
      showVariableHint.value = false;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="relative">
    <!-- Input/Textarea -->
    <component
      :is="type === 'textarea' ? 'textarea' : 'input'"
      ref="inputRef"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="[
        'w-full rounded-md border transition-colors',
        size === 'sm'
          ? 'px-2 py-1 text-xs'
          : size === 'lg'
          ? 'px-4 py-2 text-base'
          : 'px-3 py-1.5 text-sm',
        error
          ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
          : 'border-gray-300 bg-white focus:border-indigo-500 focus:ring-indigo-500',
        'focus:outline-none focus:ring-1',
        type === 'textarea' ? 'resize-y min-h-[80px]' : '',
      ]"
      @input="handleInput"
      @keydown="handleKeydownWrapper"
      @focus="handleFocus"
    />

    <!-- Variable hint badge -->

    <!-- Autocomplete dropdown -->
    <Teleport to="body">
      <div
        v-if="showAutocomplete && availableVariables.length > 0"
        ref="autocompleteRef"
        class="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto min-w-[200px]"
        :style="{
          top: `${autocompletePosition.top}px`,
          left: `${autocompletePosition.left}px`,
        }"
      >
        <div class="p-1">
          <div
            v-for="(variable, index) in availableVariables"
            :key="variable.name"
            class="px-3 py-2 rounded cursor-pointer transition-colors flex items-center justify-between"
            :class="
              index === selectedIndex
                ? 'bg-indigo-50 text-indigo-700'
                : 'hover:bg-gray-50 text-gray-700'
            "
            @click="selectVariable(variable.name)"
            @mouseenter="selectedIndex = index"
          >
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">
                {{ variable.name }}
              </div>
              <div class="text-xs text-gray-500 truncate">
                {{ variable.source }}
              </div>
            </div>
            <ChevronRight
              class="w-4 h-4 text-gray-400 shrink-0 ml-2"
              :class="index === selectedIndex ? 'text-indigo-600' : ''"
            />
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Error message -->
    <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>
