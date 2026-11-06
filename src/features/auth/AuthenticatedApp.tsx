import { createContext, useContext, useMemo, useState, useSyncExternalStore } from 'react'
import { supabase } from '../../shared/lib/supabaseClient.js'
import { AuthProvider, useAuth } from './AuthProvider'
import { AuthError, createAuthService } from './authService'
import { LoginPage } from './LoginPage'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { createProjectRepository } from '../projects/projectRepository'
import { ProjectsApp } from '../projects/ProjectsApp'
import { ProjectError } from '../projects/types'
import type { ProjectRepository, SessionUser } from '../projects/types'
import { createReportRepository } from '../reports/reportRepository'
import { ReportError } from '../reports/types'
import type { ReportRepository } from '../reports/types'

const SignOutContext = createContext({ onSignOut: () => {}, signOutPending: false, signOutError: '' })

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
        listDrafts: () => withSession(() => reports.listDrafts()),
        getDraft: id => withSession(() => reports.getDraft(id)),
        saveDraft: (input, id) => withSession(() => reports.saveDraft(input, id)),
        deleteDraft: id => withSession(() => reports.deleteDraft(id)),
        submitDraft: (id, input) => withSession(() => reports.submitDraft(id, input)),
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

  if (auth.status === 'authenticated') return <SignOutContext.Provider value={{ onSignOut: () => { void logout() }, signOutPending: pending, signOutError: error }}>
    <AuthenticatedRouter key={auth.user.id} repository={repository} reportRepository={reportRepository} user={auth.user} />
  </SignOutContext.Provider>
  return <main className="auth-page"><section className="project-panel"><h1>BugWatch</h1>
    {auth.status === 'incomplete_profile' ? <p role="alert">Account setup incomplete - contact the administrator.</p> : <>
      <p role="alert">Authentication is unavailable. Please try again.</p>
      <button type="button" onClick={() => { void auth.retry() }} disabled={pending}>Retry</button>
    </>}
    {error && <p role="alert">{error}</p>}
    <button type="button" onClick={() => { void logout() }} disabled={pending}>{pending ? 'Logging out...' : 'Log out'}</button>
  </section></main>
}

export default function AuthenticatedApp() {
  return <AuthProvider service={service}><AuthenticatedContent /></AuthProvider>
}

function AuthenticatedRouter({ repository, reportRepository, user }: { repository: ProjectRepository; reportRepository: ReportRepository; user: SessionUser }) {
  const store = useMemo(() => createRouterStore(repository, reportRepository, user), [repository, reportRepository, user])
  const router = useSyncExternalStore(store.subscribe, store.getSnapshot)
  return router ? <RouterProvider router={router} /> : null
}

function createRouterStore(repository: ProjectRepository, reportRepository: ReportRepository, user: SessionUser) {
  let router: ReturnType<typeof createBrowserRouter> | null = null
  return {
    subscribe(notify: () => void) {
      router = createBrowserRouter([{ path: '*', element: <RoutedWorkspace repository={repository} reportRepository={reportRepository} user={user} /> }])
      notify()
      return () => { router?.dispose(); router = null }
    },
    getSnapshot: () => router,
  }
}

function RoutedWorkspace(props: { repository: ProjectRepository; reportRepository: ReportRepository; user: SessionUser }) {
  const signOut = useContext(SignOutContext)
  return <ProjectsApp {...props} {...signOut} />
}
