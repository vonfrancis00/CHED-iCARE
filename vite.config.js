import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Vite injects VITE_* values into the browser, but a local server can also
  // receive them from its parent process instead of an .env file.
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };
  let apiUrl;
  try {
    apiUrl = new URL(env.VITE_SHEET_API_URL);
  } catch {
    apiUrl = null;
  }

  const sheetProxy = apiUrl && apiUrl.protocol === "https:" && apiUrl.hostname === "script.google.com"
    ? {
        "/api/sheet": {
          target: apiUrl.origin,
          changeOrigin: true,
          // Apps Script returns a redirect to its JSON response. Follow it here
          // so the browser stays on localhost throughout the request.
          followRedirects: true,
          rewrite: path => path.replace(/^\/api\/sheet/, apiUrl.pathname)
        }
      }
    : undefined;

  return {
    plugins: [react()],
    server: { port: 5173, strictPort: true, proxy: sheetProxy },
    build: { sourcemap: false }
  };
});
