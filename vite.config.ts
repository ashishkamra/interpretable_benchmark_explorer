import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const raw = process.env.BASE_PATH ?? "/";
const base = raw === "" || raw === "/" ? "/" : raw.endsWith("/") ? raw : `${raw}/`;

export default defineConfig({
  base,
  plugins: [react()],
});
