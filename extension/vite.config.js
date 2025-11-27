import { defineConfig } from 'vite'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.js'),
        popup: resolve(__dirname, 'src/popup.js'),
        'auth-bridge': resolve(__dirname, 'src/auth-bridge.js'),
        'link-interceptor': resolve(__dirname, 'src/link-interceptor.js'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: '[name].[ext]',
        format: 'es',
      },
    },
    minify: 'esbuild', // Minify for production (smaller bundle size)
  },
})
