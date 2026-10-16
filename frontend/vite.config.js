import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Génère dist/sw.js à partir de src/sw/sw.js (cahier V2 · §10, PWA) :
//  - __BUILD_ID__  : change à chaque build → le navigateur détecte la mise à jour
//  - __PRECACHE__  : fichiers de l'app à garder en cache pour l'ouvrir hors ligne
function serviceWorker() {
  return {
    name: 'movecash-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const built = Object.keys(bundle).filter((f) => !f.endsWith('.map') && f !== 'index.html')
      const precache = [
        '/index.html',
        '/site.webmanifest',
        '/icons/icon-192.png',
        '/icons/badge-96.png',
        ...built.map((f) => `/${f}`),
      ]
      const source = readFileSync(new URL('./src/sw/sw.js', import.meta.url), 'utf8')
        .replace('const BUILD_ID = "__BUILD_ID__";', `const BUILD_ID = "${Date.now().toString(36)}";`)
        .replace('const PRECACHE = __PRECACHE__;', `const PRECACHE = ${JSON.stringify(precache)};`)
      if (source.includes('"__BUILD_ID__"') || source.includes('= __PRECACHE__')) {
        this.error('sw.js : marqueurs BUILD_ID / PRECACHE non remplacés')
      }
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorker()],
  server: {
    // En dev avec VITE_API_URL=/api/ : même origine que le front, donc le cookie
    // de session client (mc_refresh) fonctionne sans configuration CORS.
    proxy: {
      '/api': process.env.VITE_API_PROXY || 'http://localhost:4000',
      '/socket.io': { target: process.env.VITE_API_PROXY || 'http://localhost:4000', ws: true },
    },
  },
})
