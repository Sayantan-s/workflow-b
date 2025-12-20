<script setup lang="ts">
import { computed, shallowRef } from "vue";

type EditorTheme = "light" | "vs-dark";
type EditorLanguage = "json" | "javascript" | "typescript" | "html" | "css";

interface Props {
  value?: string;
  language?: EditorLanguage;
  theme?: EditorTheme;
  readonly?: boolean;
  height?: string;
}

const props = withDefaults(defineProps<Props>(), {
  value: "{}",
  language: "json",
  theme: "light",
  readonly: false,
  height: "200px",
});

const emit = defineEmits<{
  "update:value": [value: string];
}>();

const editorRef = shallowRef();

const editorOptions = computed(() => ({
  automaticLayout: true,
  formatOnType: true,
  formatOnPaste: true,
  readOnly: props.readonly,
  minimap: { enabled: false },
  lineNumbers: "on",
  scrollBeyondLastLine: false,
  fontSize: 13,
  tabSize: 2,
  wordWrap: "on",
  padding: { top: 12, bottom: 12 },
  renderLineHighlight: "none",
  overviewRulerBorder: false,
  scrollbar: {
    vertical: "auto",
    horizontal: "auto",
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 8,
  },
}));

function handleMount(editor: any) {
  editorRef.value = editor;
}

function handleChange(value: string | undefined) {
  emit("update:value", value ?? "");
}
</script>

<template>
  <div
    class="rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-indigo-500 transition-all"
  >
    <vue-monaco-editor
      :value="value"
      :theme="theme"
      :language="language"
      :options="editorOptions"
      :style="{ height }"
      @update:value="handleChange"
      @mount="handleMount"
    />
  </div>
</template>
