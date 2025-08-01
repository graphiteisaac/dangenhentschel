import { defineConfig } from "vite";
import gleam from "vite-gleam";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [gleam(), tailwindcss()],
});
