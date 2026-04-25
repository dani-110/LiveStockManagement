import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
  chunkSizeWarningLimit: 1600, // Raises warning limit to 1.6MB
}
})
