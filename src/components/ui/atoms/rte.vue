<script setup lang="ts">
import { computed } from "vue";
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";

interface Props {
  modelValue?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  height?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "Write your content here...",
  disabled: false,
  height: "200px",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const content = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const hasError = computed(() => !!props.error);

const toolbarOptions = [["bold", "italic", "underline", "strike"]];

const containerClasses = computed(() => [
  "rte-container rounded-lg border overflow-hidden transition-all duration-150",
  hasError.value
    ? "border-red-500 focus-within:ring-2 focus-within:ring-red-200"
    : "border-gray-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200",
  props.disabled ? "opacity-50 pointer-events-none" : "",
]);
</script>

<template>
  <div class="w-full">
    <div :class="containerClasses">
      <QuillEditor
        v-model:content="content"
        content-type="html"
        :placeholder="placeholder"
        :read-only="disabled"
        :toolbar="toolbarOptions"
        theme="snow"
        :style="{ height }"
      />
    </div>

    <p v-if="error" class="mt-1.5 text-xs text-red-600">
      {{ error }}
    </p>
  </div>
</template>

<style>
.rte-container .ql-toolbar {
  border: none;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.rte-container .ql-container {
  border: none;
  font-size: 14px;
}

.rte-container .ql-editor {
  min-height: 120px;
}

.rte-container .ql-editor.ql-blank::before {
  color: #9ca3af;
  font-style: normal;
}
</style>
