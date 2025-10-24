import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		tailwindcss(),
		viteTsconfigPaths(),
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
		}),
		react(),
	],
	server: {
		port: 3000,
		proxy: {
			"/trpc": {
				target: "http://localhost:8080",
				changeOrigin: true,
				ws: true,
			},
		},
	},
});
