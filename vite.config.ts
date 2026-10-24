/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { parse } from 'yaml'

// Imports *.yaml files (ui-manifest.yaml) as JSON modules, parsed at build time.
function yamlPlugin(): Plugin {
  return {
    name: 'yaml',
    transform(code, id) {
      if (!id.endsWith('.yaml')) return null
      return { code: `export default ${JSON.stringify(parse(code))}`, map: null }
    },
  }
}

// Fills index.html from ui-manifest.yaml `app`: the <title> and the languages of the pre-paint language script.
function manifestHtmlPlugin(): Plugin {
  return {
    name: 'manifest-html',
    transformIndexHtml(html) {
      const { app } = parse(readFileSync('ui-manifest.yaml', 'utf8')) as { app: { name: string; languages: string[] } }
      const escaped = app.name.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      return html.replace('%APP_NAME%', escaped).replace('%APP_LANGUAGES%', JSON.stringify(app.languages))
    },
  }
}

const apiProxy = (target?: string) => (target ? { '/api': target } : undefined)

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), yamlPlugin(), manifestHtmlPlugin()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // Keycloak only accepts redirects to this port.
    port: 5173,
    strictPort: true,
    // API_PROXY_TARGET in .env.local (see .env.example); without it /api is not proxied.
    proxy: apiProxy(loadEnv(mode, process.cwd(), '').API_PROXY_TARGET),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
}))
