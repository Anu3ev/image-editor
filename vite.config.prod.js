import { defineConfig } from 'vite'
import path from 'path'
import { analyzer } from 'vite-bundle-analyzer'

/**
 * Configuration for production builds of the library.
 * The library is built into dist.
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
      // External dependencies; do not bundle them
      external: ['fabric', 'jspdf', 'jsondiffpatch', 'jsondiffpatch/with-text-diffs', 'i18next']
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
