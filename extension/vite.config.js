import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.js'),
        popup: resolve(__dirname, 'src/popup.js'),
        content: resolve(__dirname, 'src/content.js'),
        'auth-bridge': resolve(__dirname, 'src/auth-bridge.js'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        format: 'es',
      },
    },
    minify: false, // Keep readable for debugging
  },
})
