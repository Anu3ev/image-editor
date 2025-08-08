import { defineConfig } from 'vite'
import path from 'path'
import babel from 'vite-plugin-babel'

/**
 * Конфигурация для разработки и сборки проекта.
 * Если это dev-сервер, то используется src/demo как корень.
 * Если это сборка, то собирается только библиотека в dev-build.
 */
export default defineConfig(({ command }) => {
  // Базовая конфигурация
  const baseConfig = {
    base: './',
    mode: 'development',
    root: 'src/demo',

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
  }

  // Если это dev-сервер (npm run dev)
  if (command === 'serve') return baseConfig

  // Если это сборка (npm run dev:build)
  return {
    ...baseConfig,
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

      outDir: path.resolve(__dirname, 'dev-build'),
      // outDir: '/home/alexander_anufriev/Documents/Repositories/insales/app/javascript/back_office2/components/shared/fabric-image-editor/dev-build',
      emptyOutDir: true
    }
  }
})
