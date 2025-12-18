<script setup lang="ts">
import Canvas from "@/components/ui/organisms/builder/Canvas.vue";
import Pallete from "@/components/ui/organisms/builder/Pallete.vue";
import Topbar from "@/components/ui/organisms/builder/Topbar.vue";
import ConfigPanel from "@/components/ui/organisms/builder/ConfigPanel.vue";
</script>

<template>
  <Canvas>
    <Pallete />
    <Topbar />
    <ConfigPanel />
  </Canvas>
</template>
