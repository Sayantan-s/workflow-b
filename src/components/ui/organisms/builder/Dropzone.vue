<script lang="ts" setup>
import { Background } from "@vue-flow/background";
</script>

<template>
  <div class="dropzone-background">
    <Background :gap="20" :size="1" pattern-color="#99a1af" variant="dots" />

    <div class="overlay">
      <slot />
    </div>
  </div>
</template>
