import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-router-dom") || id.includes("react-dom") || id.includes("/react/")) {
            return "vendor-react";
          }
          if (id.includes("@tanstack/react-query")) {
            return "vendor-query";
          }
          if (id.includes("socket.io-client") || id.includes("engine.io-client")) {
            return "vendor-realtime";
          }
          if (id.includes("leaflet")) {
            return "vendor-maps";
          }
          if (id.includes("qrcode")) {
            return "vendor-qr";
          }
        },
      },
    },
  },
})
