import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  appType: 'spa',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/apexcharts')) return 'vendor_apexcharts'
          if (
            id.includes('node_modules/katex') ||
            id.includes('node_modules/react-markdown') ||
            id.includes('node_modules/remark-math') ||
            id.includes('node_modules/rehype-katex')
          ) {
            return 'vendor_katex'
          }
          if (id.includes('node_modules/mathjs')) return 'vendor_mathjs'
          if (id.includes('node_modules/lucide-react')) return 'vendor_lucide'
        },
      },
    },
  },
  server: {
    watch: {
      ignored: ['**/supabase/**', '**/wrangler/**', '**/.git/**'],
    },
  },
})