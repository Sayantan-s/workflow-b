import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { install as VueMonacoEditorPlugin } from "@guolao/vue-monaco-editor";
import { createPinia } from "pinia";

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(VueMonacoEditorPlugin, {
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.54.0/min/vs",
  },
});
app.mount("#app");
