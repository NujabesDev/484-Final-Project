  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'
  import tailwindcss from '@tailwindcss/vite'
  import path from 'path'
  import { fileURLToPath } from 'url'

  const __dirname = path.dirname(fileURLToPath(import.meta.url))

  export default defineConfig({
    plugins: [react(), tailwindcss()],
    base: './',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../shared'),
      },
      preserveSymlinks: true,
    },
    build: {
      rollupOptions: {
        input: {
          popup: 'popup.html',
          background: 'src/background.js'
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]'
        }
      }
    }
  })