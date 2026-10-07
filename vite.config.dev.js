import { defineConfig } from 'vite'
import path from 'path'
import basicSsl from '@vitejs/plugin-basic-ssl'

/**
 * Configuration for developing and building the project.
 * The development server uses src/demo as its root.
 * Build mode outputs only the library to dev-build.
 */
export default defineConfig(({ command, mode }) => {
  // Base configuration
  const baseConfig = {
    base: './',
    mode: 'development',
    root: 'src/demo',
    cacheDir: path.resolve(__dirname, '.cache/vite'),

    plugins: mode === 'e2e' ? [] : [
      basicSsl({
        name: 'fabric-image-editor',
        certDir: 'certs',
      }),
    ]
  }

  // For the development server (npm run dev)
  if (command === 'serve') {
    return {
      ...baseConfig,
      server: {
        host: '0.0.0.0', // Allow connections from any IP address
        port: 5173,
        strictPort: true,
        allowedHosts: [
          'localhost',
          '127.0.0.1',
          '0.0.0.0',
          'www.localhost.com', // For BrowserStack
          '.browserstack.com', // All BrowserStack subdomains
          '.bs-local.com' // BrowserStack Local
        ]
      }
    }
  }

  // For a build (npm run dev:build)
  return {
    ...baseConfig,
    build: {
      target: 'es2022',
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
        external: ['fabric', 'jspdf', 'jsondiffpatch', 'jsondiffpatch/with-text-diffs']
      },

      outDir: path.resolve(__dirname, 'dev-build'),

      emptyOutDir: true
    }
  }
})
