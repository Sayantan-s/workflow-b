<script setup lang="ts">
import { useCounterStore } from "../stores/counter";

defineProps<{ msg: string }>();

const counter = useCounterStore();
</script>

<template>
  <div class="counter">
    <h1>{{ msg }}</h1>
    <p>Count: {{ counter.count }}</p>
    <p>Double: {{ counter.doubleCount }}</p>
    <div class="buttons">
      <button @click="counter.decrement">-</button>
      <button @click="counter.increment">+</button>
    </div>
  </div>
</template>

<style scoped>
.counter {
  text-align: center;
}

.buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}

button {
  padding: 0.5rem 1.5rem;
  font-size: 1.5rem;
  border-radius: 8px;
  border: 1px solid transparent;
  background-color: #1a1a1a;
  color: white;
  cursor: pointer;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #646cff;
}

button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}
</style>
