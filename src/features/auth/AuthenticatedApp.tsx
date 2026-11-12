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

import { createMailboxRepository } from '../mailbox/mailboxRepository'
import { MailboxError } from '../mailbox/types'
import type { MailboxRepository } from '../mailbox/types'

const SignOutContext = createContext({ onSignOut: () => {}, signOutPending: false, signOutError: '' })

const service = createAuthService(supabase)
const projectRepository = createProjectRepository(supabase)
const reports = createReportRepository(supabase)
const mailbox = createMailboxRepository(supabase)

function AuthenticatedContent() {
  const auth = useAuth()
  const retryAuth = auth.retryIfCurrent
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const { repository, reportRepository, mailboxRepository } = useMemo<{
    repository: ProjectRepository
    mailboxRepository: MailboxRepository
    reportRepository: ReportRepository
  }>(() => {
    async function withSession<T>(operation: () => Promise<T>): Promise<T> {
      try { return await operation() }
      catch (reason) {
        if ((reason instanceof ProjectError || reason instanceof ReportError || reason instanceof MailboxError)
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
      mailboxRepository: {
        listItems: filter => withSession(() => mailbox.listItems(filter)),
        markRead: id => withSession(() => mailbox.markRead(id)),
        deleteItem: id => withSession(() => mailbox.deleteItem(id)),
      },
      reportRepository: {
        editReport: (id, request) => withSession(() => reports.editReport(id, request)),
        listDrafts: () => withSession(() => reports.listDrafts()),
        getDraft: id => withSession(() => reports.getDraft(id)),
        saveDraft: (input, id) => withSession(() => reports.saveDraft(input, id)),
        deleteDraft: id => withSession(() => reports.deleteDraft(id)),
        submitDraft: (id, input) => withSession(() => reports.submitDraft(id, input)),
        createReport: input => withSession(() => reports.createReport(input)),
        getReport: id => withSession(() => reports.getReport(id)),
        acceptReport: id => withSession(() => reports.acceptReport(id)),
        startInvestigation: id => withSession(() => reports.startInvestigation(id)),
        awaitTesterInformation: id => withSession(() => reports.awaitTesterInformation(id)),
        resumeInvestigation: id => withSession(() => reports.resumeInvestigation(id)),
        resolveReport: (id, input) => withSession(() => reports.resolveReport(id, input)),
        linkDuplicate: (id, canonicalReportId, expectedCanonicalReportId) => withSession(() => reports.linkDuplicate(id, canonicalReportId, expectedCanonicalReportId)),
        listReportComments: id => withSession(() => reports.listReportComments(id)),
        postReportComment: (id, input) => withSession(() => reports.postReportComment(id, input)),
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
    <AuthenticatedRouter key={auth.user.id} repository={repository} reportRepository={reportRepository} mailboxRepository={mailboxRepository} user={auth.user} />
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

function AuthenticatedRouter({ repository, reportRepository, mailboxRepository, user }: { repository: ProjectRepository; reportRepository: ReportRepository; mailboxRepository: MailboxRepository; user: SessionUser }) {
  const store = useMemo(() => createRouterStore(repository, reportRepository, mailboxRepository, user), [repository, reportRepository, mailboxRepository, user])
  const router = useSyncExternalStore(store.subscribe, store.getSnapshot)
  return router ? <RouterProvider router={router} /> : null
}

function createRouterStore(repository: ProjectRepository, reportRepository: ReportRepository, mailboxRepository: MailboxRepository, user: SessionUser) {
  let router: ReturnType<typeof createBrowserRouter> | null = null
  return {
    subscribe(notify: () => void) {
      router = createBrowserRouter([{ path: '*', element: <RoutedWorkspace repository={repository} reportRepository={reportRepository} mailboxRepository={mailboxRepository} user={user} /> }])
      notify()
      return () => { router?.dispose(); router = null }
    },
    getSnapshot: () => router,
  }
}

function RoutedWorkspace(props: { repository: ProjectRepository; reportRepository: ReportRepository; mailboxRepository: MailboxRepository; user: SessionUser }) {
  const signOut = useContext(SignOutContext)
  return <ProjectsApp {...props} {...signOut} />
}
