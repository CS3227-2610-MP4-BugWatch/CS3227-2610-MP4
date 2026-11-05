import { useMemo, useState } from 'react'
import { supabase } from '../../shared/lib/supabaseClient.js'
import { AuthProvider, useAuth } from './AuthProvider'
import { AuthError, createAuthService } from './authService'
import { LoginPage } from './LoginPage'
import { BrowserRouter } from 'react-router'
import { createProjectRepository } from '../projects/projectRepository'
import { ProjectsApp } from '../projects/ProjectsApp'
import { ProjectError } from '../projects/types'
import type { ProjectRepository } from '../projects/types'
import { createReportRepository } from '../reports/reportRepository'
import { ReportError } from '../reports/types'
import type { ReportRepository } from '../reports/types'

const service = createAuthService(supabase)
const projectRepository = createProjectRepository(supabase)
const reports = createReportRepository(supabase)

function AuthenticatedContent() {
  const auth = useAuth()
  const retryAuth = auth.retryIfCurrent
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const { repository, reportRepository } = useMemo<{
    repository: ProjectRepository
    reportRepository: ReportRepository
  }>(() => {
    async function withSession<T>(operation: () => Promise<T>): Promise<T> {
      try { return await operation() }
      catch (reason) {
        if ((reason instanceof ProjectError || reason instanceof ReportError)
          && reason.code === 'unauthenticated') retryAuth()
        throw reason
      }
    }
    return {
      repository: {
        listActiveProjects: () => withSession(() => projectRepository.listActiveProjects()),
        getProject: id => withSession(() => projectRepository.getProject(id)),
        listProjectHistory: id => withSession(() => projectRepository.listProjectHistory(id)),
        createProject: input => withSession(() => projectRepository.createProject(input)),
        updateProject: (id, revision, input) => withSession(() => projectRepository.updateProject(id, revision, input)),
      },
      reportRepository: {
        createReport: input => withSession(() => reports.createReport(input)),
        getReport: id => withSession(() => reports.getReport(id)),
        listReportHistory: id => withSession(() => reports.listReportHistory(id)),
        listProjectReports: id => withSession(() => reports.listProjectReports(id)),
      },
    }
  }, [retryAuth])

  async function logout() {
    setPending(true)
    setError('')
    try {
      await auth.signOut()
    } catch (error) {
      setError(error instanceof AuthError ? error.message : 'Logout failed. Please try again.')
    } finally {
      setPending(false)
    }
  }

  if (auth.status === 'signed_out') return <LoginPage />
  if (auth.status === 'loading') return <p role="status">Loading your account…</p>

  return (
    <main className="project-workspace">
      <h1>BugWatch</h1>
      {auth.status === 'authenticated' ? (
        <BrowserRouter key={auth.user.id}>
          <p>Signed in as {auth.user.displayName} ({auth.user.role})</p>
          <ProjectsApp repository={repository} reportRepository={reportRepository} user={auth.user} />
        </BrowserRouter>
      ) : auth.status === 'incomplete_profile' ? (
        <p role="alert">Account setup incomplete—contact the administrator.</p>
      ) : (
        <>
          <p role="alert">Authentication is unavailable. Please try again.</p>
          <button type="button" onClick={() => { void auth.retry() }} disabled={pending}>Retry</button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={() => { void logout() }} disabled={pending}>
        {pending ? 'Logging out…' : 'Log out'}
      </button>
    </main>
  )
}

export default function AuthenticatedApp() {
  return <AuthProvider service={service}><AuthenticatedContent /></AuthProvider>
}
