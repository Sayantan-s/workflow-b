import { createApp } from "vue";
import "./style.css";
import "@vueup/vue-quill/dist/vue-quill.snow.css";

import App from "./App.vue";
import { install as VueMonacoEditorPlugin } from "@guolao/vue-monaco-editor";
import { createPinia } from "pinia";
import { QuillEditor } from "@vueup/vue-quill";

const pinia = createPinia();
const app = createApp(App);

app.component("QuillEditor", QuillEditor);
app.use(pinia);
app.use(VueMonacoEditorPlugin, {
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.54.0/min/vs",
  },
});
app.mount("#app");
