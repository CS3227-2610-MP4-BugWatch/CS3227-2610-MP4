import { createClient } from '@supabase/supabase-js'
import { createReportRepository } from '../../src/features/reports/reportRepository.js'
import { questionContext } from '../../src/features/reports/testerQuestionTypes.js'
import { questionEligibility, testerQuestionMessages } from '../developer/tester-questions.js'
import type { TesterQuestionDependencies } from '../developer/tester-questions.js'
import { requestSoCLaaS } from './_soclaas.js'

const statelessAuth = { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }

export function createTesterQuestionDependencies(env: NodeJS.ProcessEnv): TesterQuestionDependencies | null {
  const url = env.VITE_SUPABASE_URL?.trim() || env.SUPABASE_URL?.trim()
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || env.SUPABASE_PUBLISHABLE_KEY?.trim()
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const apiKey = env.SOCLAAS_API_KEY?.trim()
  const model = env.SOCLAAS_MODEL?.trim()
  if (env.DEVELOPER_QUESTIONS_ENABLED !== 'true' || !url || !publishableKey || !serviceRoleKey || !apiKey || !model) return null
  const userClient = (token: string) => createClient(url, publishableKey, {
    auth: statelessAuth, global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const quotaClient = createClient(url, serviceRoleKey, { auth: statelessAuth })
  const authenticate: TesterQuestionDependencies['authenticate'] = async token => {
    const client = userClient(token)
    const { data, error } = await client.auth.getUser(token)
    if (error) {
      if (error.status === 400 || error.status === 401 || error.status === 403 || error.name === 'AuthSessionMissingError') return null
      throw error
    }
    if (!data.user) return null
    const { data: profile, error: profileError } = await client.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
    if (profileError) throw profileError
    return profile ? { id: data.user.id, role: profile.role as string } : null
  }
  return {
    authenticate,
    async loadContext(token, reportId) {
      const repository = createReportRepository(userClient(token))
      const report = await repository.getReport(reportId)
      if (!report) return null
      const discussion = await repository.listReportComments(reportId)
      return { ...questionContext({ report, discussion }), assignedDeveloperId: report.assignedDeveloperId,
        state: report.state, projectArchived: report.projectArchivedAt !== null }
    },
    async checkEligibility(token, reportId, actorId) {
      const actor = await authenticate(token)
      if (!actor || actor.id.toLowerCase() !== actorId.toLowerCase() || actor.role !== 'developer') return 'forbidden'
      const report = await createReportRepository(userClient(token)).getReport(reportId)
      if (!report) return 'not_found'
      return questionEligibility({ report, discussion: [], assignedDeveloperId: report.assignedDeveloperId,
        state: report.state, projectArchived: report.projectArchivedAt !== null }, actorId)
    },
    async reserve(actorId) {
      const { data, error } = await quotaClient.rpc('reserve_developer_question_attempt', { p_actor_id: actorId })
      if (error) throw error
      if (typeof data?.allowed !== 'boolean' || !Number.isSafeInteger(data.retryAfterMs)
        || (data.allowed ? data.retryAfterMs !== 0 : data.retryAfterMs <= 0)) throw new Error('Invalid quota reservation result')
      return { allowed: data.allowed as boolean, retryAfterMs: data.retryAfterMs as number }
    },
    generate: context => requestSoCLaaS(apiKey, model, testerQuestionMessages(context), {
      // Tentative operational bounds: manual model review is required before feature completion.
      timeoutMs: 15_000, maxOutputTokens: 1_500, temperature: 0.7, topP: 0.8,
    }),
  }
}
