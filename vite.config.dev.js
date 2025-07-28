import { defineConfig } from 'vite'
import path from 'path'
import babel from 'vite-plugin-babel'

export default defineConfig({
  base: './',
  root: path.resolve(__dirname, 'docs/demo'),
  mode: 'development',

  build: {
    target: 'es2015',
    sourcemap: true,
    minify: false,
    watch: {},

    lib: {
      entry: {
        main: path.resolve(__dirname, 'src/main.ts')
      },
      name: 'ImageEditor',
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`
    },

    rollupOptions: {
      external: ['fabric', 'jspdf', 'jsondiffpatch', 'diff-match-patch']
    },

    // Папка проекта, куда будет собираться код
    outDir: path.resolve(__dirname, 'dev-build'),

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
    })
  ]
})
