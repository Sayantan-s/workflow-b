import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import Components from "unplugin-vue-components/vite";
import RekaResolver from "reka-ui/resolver";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    Components({
      dts: true,
      resolvers: [RekaResolver()],
    }),
  ],
  server: {
    open: true,
  },
});
