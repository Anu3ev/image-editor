import { defineConfig } from 'vite'
import path from 'path'
import babel from 'vite-plugin-babel'
import { analyzer } from 'vite-bundle-analyzer'

/**
 * Конфигурация для сборки библиотеки в продакшн.
 * Сборка библиотеки выполняется в dist.
 */
export default defineConfig({
  base: './',

  build: {
    target: 'es2015',
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
    babel({
      babelConfig: {
        babelrc: false,
        configFile: false,
        presets: [
          ['@babel/preset-env', {
            modules: false,
            targets: { esmodules: true }
          }]
        ]
      }
    }),
    analyzer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      defaultSizes: 'parsed'
    })
  ]
})
