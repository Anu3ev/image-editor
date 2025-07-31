import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'
import babel from 'vite-plugin-babel'

export default defineConfig({
  base: './',
  build: {
    target: 'es2015',
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
        dir: 'docs/js/image-editor', // Специально для библиотеки
        entryFileNames: 'main.js'
      }
    }
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
    viteStaticCopy({
      targets: [
        // Копируем из src/demo в выходную папку
        { src: 'src/demo/index.html', dest: '.' },
        { src: 'src/demo/style.css', dest: '.' },
        {
          src: 'src/demo/js/*.js',
          dest: './js',
          transform: (content, filePath) => {
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
