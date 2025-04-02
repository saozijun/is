import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    plugins: [
      vue()
    ],
    // 本地服务
    server: {
      open: false,
      // 是否开启 https
      https: false,
      // 服务端渲染
      ssr: false,
      cors: true,
      proxy: {
        [env.VITE_APP_BASE_API]: {
          target: "https://xin.iswenchuang.cn/api",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        }
      },
    }
  };
});