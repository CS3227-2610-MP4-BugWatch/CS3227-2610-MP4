import { createClient } from '@supabase/supabase-js'
import type { ReportSuggestionDependencies } from '../tester/report-suggestions.js'
import { createSoCLaaSGenerator } from './_soclaas.js'

const statelessAuth = { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }

export function createReportSuggestionDependencies(env: NodeJS.ProcessEnv): ReportSuggestionDependencies | null {
  const url = env.VITE_SUPABASE_URL?.trim() || env.SUPABASE_URL?.trim()
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || env.SUPABASE_PUBLISHABLE_KEY?.trim()
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const apiKey = env.SOCLAAS_API_KEY?.trim()
  const model = env.SOCLAAS_MODEL?.trim()
  if (env.TESTER_SUGGESTIONS_ENABLED !== 'true' || !url || !publishableKey || !serviceRoleKey || !apiKey || !model) {
    return null
  }

  const userClient = (token: string) => createClient(url, publishableKey, {
    auth: statelessAuth,
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const quotaClient = createClient(url, serviceRoleKey, { auth: statelessAuth })

  return {
    async authenticate(token) {
      const client = userClient(token)
      const { data, error } = await client.auth.getUser(token)
      if (error) {
        if (error.status === 400 || error.status === 401 || error.status === 403 || error.name === 'AuthSessionMissingError') {
          return null
        }
        throw error
      }
      if (!data.user) return null
      const { data: profile, error: profileError } = await client.from('profiles')
        .select('role').eq('id', data.user.id).maybeSingle()
      if (profileError) throw profileError
      return profile ? { id: data.user.id, role: profile.role as string } : null
    },
    async findProject(token, projectId) {
      const { data, error } = await userClient(token).from('projects')
        .select('name,description,archived_at').eq('id', projectId).maybeSingle()
      if (error) throw error
      return data ? { name: data.name as string, description: data.description as string, archived: data.archived_at !== null } : null
    },
    async reserve(actorId) {
      const { data, error } = await quotaClient.rpc('reserve_tester_suggestion_attempt', { p_actor_id: actorId })
      if (error) throw error
      if (typeof data?.allowed !== 'boolean' || !Number.isSafeInteger(data.retryAfterMs)
        || (data.allowed ? data.retryAfterMs !== 0 : data.retryAfterMs <= 0)) {
        throw new Error('Invalid quota reservation result')
      }
      return { allowed: data.allowed as boolean, retryAfterMs: data.retryAfterMs as number }
    },
    generate: createSoCLaaSGenerator(apiKey, model),
  }
}
