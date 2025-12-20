<script setup lang="ts">
import { Toaster } from "vue-sonner";
</script>

<template>
  <Canvas>
    <Pallete />
    <Topbar />
    <ConfigPanel />
  </Canvas>
  <Toaster position="bottom-left" :expand="true" rich-colors />
</template>
