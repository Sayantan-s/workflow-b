<script setup lang="ts">
import { Toaster } from "vue-sonner";
import { useWorkflowStore } from "@/stores/workflow";
import { useHistoryKeyboard } from "@/composables/useWorkflowHistory";

const workflowStore = useWorkflowStore();

// Setup keyboard shortcuts for undo/redo (Cmd+Z, Cmd+Shift+Z)
useHistoryKeyboard({
  onUndo: () => workflowStore.undo(),
  onRedo: () => workflowStore.redo(),
  canUndo: () => workflowStore.canUndo,
  canRedo: () => workflowStore.canRedo,
});
</script>

<template>
  <Canvas>
    <Pallete />
    <Topbar />
    <ConfigPanel />
    <ExecutionPanel />
  </Canvas>

  <!-- Palette drawer (opens from edge plus buttons or sidebar) -->
  <PaletteDrawer />

  <Toaster position="bottom-left" :expand="true" rich-colors />
</template>
