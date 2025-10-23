import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			// 'server/src/': path.join(__dirname, '../server/src/'),
			"pages/": path.join(__dirname, "src/pages/"),
			"components/": path.join(__dirname, "src/components/"),
			"routes/": path.join(__dirname, "src/routes/"),
			"utils/": path.join(__dirname, "src/utils/"),
		},
	},
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
