import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "logo192.png",
        "logo512.png",
        "robots.txt",
      ],
      manifest: {
        name: "Tick Time Tracker",
        short_name: "Tick Tracker",
        description:
          "Manage your time entries efficiently with Tick Time Tracker",
        theme_color: "#667eea",
        background_color: "#ffffff",
        display: "standalone",
        start_url: ".",
        icons: [
          {
            src: "favicon.ico",
            sizes: "64x64 32x32 24x24 16x16",
            type: "image/x-icon",
          },
          {
            src: "logo192.png",
            type: "image/png",
            sizes: "192x192",
          },
          {
            src: "logo512.png",
            type: "image/png",
            sizes: "512x512",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/www\.tickspot\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "tick-api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "https://www.tickspot.com",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api/, ""),
        configure: (proxy: any, _options: any) => {
          proxy.on("error", (err: any, _req: any, _res: any) => {
            console.log("proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq: any, req: any, _res: any) => {
            console.log("Sending Request to the Target:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes: any, req: any, _res: any) => {
            console.log(
              "Received Response from the Target:",
              proxyRes.statusCode,
              req.url,
            );
          });
        },
      },
    },
  },
  build: {
    outDir: "build",
    sourcemap: true,
  },
});
