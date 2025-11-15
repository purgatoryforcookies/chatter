import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { oidcSpa } from "oidc-spa/vite-plugin";
import { defineConfig } from "vite";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		vueDevTools(),
		tailwindcss(),
		oidcSpa({
			freezeFetch: true,
			freezeXMLHttpRequest: true,
			freezeWebSocket: true,
		}),
	],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	server: {
		allowedHosts: ["client"],
		host: "0.0.0.0",
		watch: {
			useFsEvents: true,
			usePolling: true,
		},
	},
});
