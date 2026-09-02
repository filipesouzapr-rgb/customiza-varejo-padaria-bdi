import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build de demonstracao: a mesma tela do PDV (Electron), publicada como
// site comum. So funciona porque o renderer nunca dependeu de nada nativo
// do Electron (sem window.electron/ipc) - e' so React + Supabase.
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  envDir: __dirname,
  envPrefix: ['RENDERER_VITE_'],
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src'),
    },
  },
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'dist-web'),
    emptyOutDir: true,
  },
})
