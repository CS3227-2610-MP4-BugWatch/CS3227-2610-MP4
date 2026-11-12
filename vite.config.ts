import react from '@vitejs/plugin-react'
import { Readable } from 'node:stream'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'

function localReportApi(): Plugin {
  return {
    name: 'local-report-api',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir, '')
      for (const name of [
        'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY',
        'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
        'SOCLAAS_API_KEY', 'SOCLAAS_MODEL', 'TESTER_SUGGESTIONS_ENABLED', 'DEVELOPER_QUESTIONS_ENABLED',
      ]) {
        if (env[name] !== undefined) process.env[name] = env[name]
      }
      server.middlewares.use(async (incoming, outgoing, next) => {
        const url = new URL(incoming.url ?? '/', 'http://localhost')
        const routes: Record<string, string> = {
          '/api/tester/report-suggestions': '/api/tester/report-suggestions.ts',
          '/api/developer/tester-questions': '/api/developer/tester-questions.ts',
        }
        const endpointPath = routes[url.pathname]
        if (!endpointPath) return next()
        try {
          const headers = new Headers()
          for (const [name, value] of Object.entries(incoming.headers)) {
            if (Array.isArray(value)) value.forEach(item => headers.append(name, item))
            else if (value !== undefined) headers.set(name, value)
          }
          const method = incoming.method ?? 'GET'
          const init: RequestInit & { duplex?: 'half' } = { method, headers }
          if (method !== 'GET' && method !== 'HEAD') {
            init.body = Readable.toWeb(incoming) as ReadableStream<Uint8Array>
            init.duplex = 'half'
          }
          const endpoint = await server.ssrLoadModule(endpointPath)
          const response: Response = await endpoint.default.fetch(new Request(url, init))
          outgoing.statusCode = response.status
          response.headers.forEach((value, name) => outgoing.setHeader(name, value))
          outgoing.end(Buffer.from(await response.arrayBuffer()))
        } catch {
          outgoing.statusCode = 500
          outgoing.setHeader('Content-Type', 'application/json')
          outgoing.setHeader('Cache-Control', 'no-store')
          outgoing.end(JSON.stringify({ code: 'unavailable' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localReportApi()],
})
