import { relayScope } from './config/build-plugins/relay-scope'
import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  main: {
    plugins: [relayScope(), externalizeDepsPlugin()],
    build: {
      outDir: 'out/relay/main',
      rollupOptions: {
        external: ['electron', 'node-pty'],
        input: { index: resolve('src/main/relay/index.ts') },
        output: { format: 'cjs', entryFileNames: 'index.js' }
      }
    }
  },
  preload: {
    plugins: [relayScope(), externalizeDepsPlugin()],
    build: {
      outDir: 'out/relay/preload',
      rollupOptions: {
        external: ['electron'],
        input: { index: resolve('src/preload/relay/index.ts') },
        output: { format: 'cjs', entryFileNames: 'index.js' }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: {
        '@/i18n/i18n': resolve('src/renderer/src/relay/labels.ts'),
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [relayScope(), react(), tailwindcss()],
    build: {
      outDir: 'out/relay/renderer',
      minify: true,
      rollupOptions: { input: resolve('src/renderer/relay.html') }
    }
  }
})
