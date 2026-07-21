import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  build: {
    rollupOptions: {
      output: {
        // Split heavy libraries into their own chunks so the initial
        // bundle isn't one ~1.4MB blob — keeps first load fast.
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) return 'firebase'
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) return 'pdf'
          if (id.includes('node_modules/framer-motion')) return 'motion'
          // html5-qrcode is dynamically imported at the point of use, so Vite
          // chunks it automatically — forcing it into a manual chunk here can
          // change its load order and break initialisation.
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router-dom') ||
            id.includes('node_modules/react/')
          ) return 'react'
        },
      },
    },
  },
})
