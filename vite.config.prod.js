import { defineConfig } from 'vite'
import path from 'path'
import { analyzer } from 'vite-bundle-analyzer'

/**
 * Конфигурация для сборки библиотеки в продакшн.
 * Сборка библиотеки выполняется в dist.
 */
export default defineConfig({
  base: './',

  build: {
    target: 'es2022',
    sourcemap: false,

    lib: {
      entry: {
        main: path.resolve(__dirname, 'src/main.ts')
      },
      name: 'ImageEditor',
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`
    },

    rollupOptions: {
      // внешние зависимости – не бандлить их
      external: ['fabric', 'jspdf', 'jsondiffpatch', 'diff-match-patch']
    },

    outDir: 'dist',
    emptyOutDir: true
  },

  plugins: [
    analyzer({
      analyzerMode: 'static',
      fileName: '../stats',
      gzipSize: true,
      brotliSize: true,
      openAnalyzer: true,
      gzipOptions: {},
      brotliOptions: {},
      defaultSizes: 'stat'
    })
  ]
})
