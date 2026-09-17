import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import sheetHandler from "./api/sheet.js";

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  return {
    plugins: [react(), {
      name: "local-sheet-api",
      configureServer(server) {
        server.middlewares.use("/api/sheet", (req, res) => {
          // Use the same bounded request/retry path in development and production.
          res.status = code => { res.statusCode = code; return res; };
          res.json = payload => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(payload));
            return res;
          };
          sheetHandler(req, res, env).catch(() => {
            if (!res.writableEnded) res.status(502).json({
              success: false, message: "Unable to load records. Please retry."
            });
          });
        });
      }
    }],
    server: { port: 5173, strictPort: true },
    build: { sourcemap: false }
  };
});
