import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

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
        entryFileNames: 'js/image-editor/main.js'
      }
    }
  },
  plugins: [
    {
      name: 'demo-build-identity',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'build-info.json',
          source: JSON.stringify({
            sha: process.env.BUILD_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
            version: JSON.parse(readFileSync('package.json', 'utf8')).version,
            buildId: process.env.BUILD_ID ?? 'local'
          })
        })
      }
    },
    viteStaticCopy({
      targets: [
        // Копируем из src/demo в выходную папку
        { src: 'src/demo/index.html', dest: '.' },
        { src: 'src/demo/style.css', dest: '.' },
        { src: 'src/demo/vendor/*.css', dest: './vendor' },
        { src: 'src/demo/samples', dest: '.' },
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
