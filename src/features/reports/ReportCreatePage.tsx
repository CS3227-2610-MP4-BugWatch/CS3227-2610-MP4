import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import type { Project, ProjectRepository, SessionUser } from '../projects/types'
import { ReportForm } from './ReportForm'
import { ReportError } from './types'
import type { ReportDraft, ReportFieldErrors, ReportInput, ReportRepository } from './types'

type Props = { projectRepository: ProjectRepository; reportRepository: ReportRepository; user: SessionUser; draft?: ReportDraft; savedDrafts?: Map<string, ReportDraft> }
type ProjectsState = { status: 'loading' | 'error' } | { status: 'ready'; projects: Project[] }

export function ReportCreatePage({ projectRepository, reportRepository, user, draft, savedDrafts }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [projectsState, setProjectsState] = useState<ProjectsState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState(location.state?.draftSaved ? 'Draft saved' : '')
  const [archivedProjectId, setArchivedProjectId] = useState(draft?.projectArchivedAt ? draft.projectId : '')
  const [fieldErrors, setFieldErrors] = useState<ReportFieldErrors>({})
  const [savedInput, setSavedInput] = useState<ReportInput | null>(draft ? inputFromDraft(draft) : null)
  const active = useRef(false)
  const saveLock = useRef(false)
  const allowNavigation = useRef(false)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  useEffect(() => {
    if (user.role !== 'tester') return
    let current = true
    projectRepository.listActiveProjects().then(projects => {
      if (current) setProjectsState({ status: 'ready', projects: projects.filter(project => project.archivedAt === null) })
    }).catch(() => { if (current) setProjectsState({ status: 'error' }) })
    return () => { current = false }
  }, [projectRepository, user.role, attempt])
  async function write(input: ReportInput, saveDraft: boolean) {
    if (saveLock.current || user.role !== 'tester' || input.projectId === archivedProjectId) return
    saveLock.current = true; setPending(true); setError(''); setConfirmation(''); setFieldErrors({})
    try {
      if (saveDraft) {
        const saved = await reportRepository.saveDraft(input, draft?.id)
        if (active.current) {
          setSavedInput(inputFromDraft(saved)); setConfirmation('Draft saved')
          if (!draft) { savedDrafts?.set(saved.id, saved); allowNavigation.current = true; void navigate(`/drafts/${saved.id}`, { replace: true, state: { draftSaved: true } }) }
        }
      } else {
        const report = draft ? await reportRepository.submitDraft(draft.id, input) : await reportRepository.createReport(input)
        if (active.current) { allowNavigation.current = true; void navigate(`/reports/${report.id}`) }
      }
    } catch (reason) {
      if (active.current) {
        if (reason instanceof ReportError && reason.code === 'archived') setArchivedProjectId(input.projectId)
        else if (!(reason instanceof ReportError) || reason.code === 'unavailable') setError(saveDraft ? 'Draft could not be saved. Please try again.' : 'We couldn’t confirm whether your report was saved. Please try again.')
        else { setError(reason.message); setFieldErrors(reason.fieldErrors ?? {}) }
      }
    } finally { saveLock.current = false; if (active.current) setPending(false) }
  }
  if (user.role !== 'tester') return <section className="project-panel"><h2>Tester access required</h2><p>Only testers can submit reports.</p><Link to="/projects">Back to projects</Link></section>
  const selected = searchParams.get('projectId') ?? ''
  const projects = projectsState.status === 'ready' ? projectsState.projects : []
  return <section className="project-panel">
    <h2>{draft ? 'Edit draft' : 'Report a bug'}</h2><p className="page-intro">{draft ? 'Continue your private draft, then submit it when ready.' : 'Describe what happened so a developer can reproduce the problem.'}</p><Link to="/projects">Back to projects</Link>
    {projectsState.status === 'loading' && <p role="status">Loading projects…</p>}
    {projectsState.status === 'error' && <><p role="alert">Projects could not be loaded. Please try again.</p><button type="button" onClick={() => { setProjectsState({ status: 'loading' }); setAttempt(value => value + 1) }}>Retry</button></>}
    {projectsState.status === 'ready' && !projects.length && <p>No active projects are available.</p>}
    {(!!draft || (projectsState.status === 'ready' && !!projects.length)) && <ReportForm projects={projects} projectsAvailable={projectsState.status === 'ready'}
      initialProjectId={projects.some(project => project.id === selected) ? selected : ''} initialInput={draft ? inputFromDraft(draft) : undefined}
      pending={pending} error={error} fieldErrors={fieldErrors} archivedProjectId={archivedProjectId} archivedProjectName={draft?.projectName}
      savedInput={savedInput} isDraft={!!draft} confirmation={confirmation} allowNavigation={allowNavigation}
      onSubmit={input => { void write(input, false) }} onSaveDraft={input => { void write(input, true) }}
      onCancel={projectId => { void navigate(projects.some(project => project.id === projectId) ? `/projects/${projectId}` : '/projects') }} />}
  </section>
}
function inputFromDraft(draft: ReportDraft): ReportInput {
  return { projectId: draft.projectId, title: draft.title, description: draft.description, version: draft.version, reproductionSteps: draft.reproductionSteps, expectedResults: draft.expectedResults, actualResults: draft.actualResults, severity: draft.severity, testEnvironment: draft.testEnvironment }
}
