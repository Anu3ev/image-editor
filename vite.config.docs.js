import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    lib: {
      entry: path.resolve(__dirname, 'src/main.ts'),
      name: 'ImageEditor',
      formats: ['es'],
      fileName: () => 'js/image-editor/main.js'
    },
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        dir: 'docs/js/image-editor', // Dedicated to the library
        entryFileNames: 'main.js'
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        // Copy from src/demo to the output folder
        { src: 'src/demo/index.html', dest: '.' },
        { src: 'src/demo/style.css', dest: '.' },
        { src: 'src/demo/vendor/*.css', dest: './vendor' },
        {
          src: 'src/demo/js/*.js',
          dest: './js',
          transform: (content, filePath) => {
            if (filePath.endsWith(path.join('js', 'editor-module-loader.js'))) {
              return content
                .toString()
                .replace(
                  "import('../../main.js')",
                  "import('./image-editor/main.js')"
                )
            }

            return content
          }
        },
        {
          src: 'src/demo/js/listeners/*.js',
          dest: './js/listeners'
        }
      ]
    })
  ]
})
