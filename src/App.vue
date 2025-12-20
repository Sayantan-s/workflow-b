<script setup lang="ts">
import { Toaster } from "vue-sonner";
</script>

<template>
  <Canvas>
    <Pallete />
    <Topbar />
    <ConfigPanel />
  </Canvas>

  <!-- Palette drawer (opens from edge plus buttons or sidebar) -->
  <PaletteDrawer />

  <Toaster position="bottom-left" :expand="true" rich-colors />
</template>
