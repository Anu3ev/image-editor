import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'
import babel from 'vite-plugin-babel'
import { analyzer } from 'vite-bundle-analyzer'

/**
 * Конфигурация для сборки демо редактора для GitHub Pages.
 * Сборка выполняется в docs/demo, откуда и будет загружаться на GitHub Pages
 */
export default defineConfig({
  base: './',
  root: 'src/demo',
  build: {
    target: 'es2015',
    sourcemap: false,
    lib: {
      entry: path.resolve(__dirname, 'src/main.ts'),
      name: 'ImageEditor',
      formats: ['es'],
      fileName: () => 'js/image-editor/main.js'
    },
    outDir: '../../docs/demo',
    emptyOutDir: true
  },
  plugins: [
    babel({
      babelConfig: {
        babelrc: false,
        configFile: false,
        presets: [
          ['@babel/preset-env', { modules: false, targets: { esmodules: true } }]
        ]
      }
    }),
    analyzer({ open: true, gzipSize: true, brotliSize: true, defaultSizes: 'parsed' }),
    viteStaticCopy({
      targets: [
        // копируем HTML и CSS для демо
        { src: 'index.html', dest: '.' },
        { src: 'style.css',      dest: '.' },
        // копируем все демо-скрипты и подменяем import в index.js
        {
          src: 'js/*.js',
          dest: 'js',
          transform: (content, filePath) => {
            // для src/demo/js/index.js поправим импорт initEditor
            if (filePath.endsWith(path.join('js', 'index.js'))) {
              return content
                .toString()
                .replace(
                  /import initEditor from ['"].*['"]/,
                  'import initEditor from \'./image-editor/main.js\''
                )
            }
            return content
          }
        }
      ]
    })
  ]
})
