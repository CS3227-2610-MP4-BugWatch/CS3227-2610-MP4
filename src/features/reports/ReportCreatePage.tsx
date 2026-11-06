import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import type { Project, ProjectRepository, SessionUser } from '../projects/types'
import { ReportForm } from './ReportForm'
import { ReportError } from './types'
import type { ReportFieldErrors, ReportInput, ReportRepository } from './types'

type Props = {
  projectRepository: ProjectRepository
  reportRepository: ReportRepository
  user: SessionUser
}

type ProjectsState = { status: 'loading' | 'error' } | { status: 'ready'; projects: Project[] }

export function ReportCreatePage({ projectRepository, reportRepository, user }: Props) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [projectsState, setProjectsState] = useState<ProjectsState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [archivedProjectId, setArchivedProjectId] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ReportFieldErrors>({})
  const active = useRef(false)
  const saveLock = useRef(false)

  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])

  useEffect(() => {
    if (user.role !== 'tester') return
    let current = true
    projectRepository.listActiveProjects().then(projects => {
      if (current) setProjectsState({ status: 'ready', projects: projects.filter(project => project.archivedAt === null) })
    }).catch(() => {
      if (current) setProjectsState({ status: 'error' })
    })
    return () => { current = false }
  }, [projectRepository, user.role, attempt])

  async function save(input: ReportInput) {
    if (saveLock.current || user.role !== 'tester' || input.projectId === archivedProjectId) return
    saveLock.current = true
    setPending(true)
    setError('')
    setFieldErrors({})
    try {
      const report = await reportRepository.createReport(input)
      if (active.current) void navigate(`/reports/${report.id}`)
    } catch (reason) {
      if (active.current) {
        if (reason instanceof ReportError && reason.code === 'archived') {
          setArchivedProjectId(input.projectId)
        } else if (!(reason instanceof ReportError) || reason.code === 'unavailable') {
          setError('We couldn’t confirm whether your report was saved. Please try again.')
        } else {
          setError(reason.message)
          setFieldErrors(reason.fieldErrors ?? {})
        }
      }
    } finally {
      saveLock.current = false
      if (active.current) setPending(false)
    }
  }

  if (user.role !== 'tester') return <section className="project-panel">
    <h2>Tester access required</h2><p>Only testers can submit reports.</p><Link to="/projects">Back to projects</Link>
  </section>

  const selected = searchParams.get('projectId') ?? ''
  const projects = projectsState.status === 'ready' ? projectsState.projects : []
  return <section className="project-panel">
    <h2>Report a bug</h2>
    <Link to="/projects">Back to projects</Link>
    {projectsState.status === 'loading' && <p role="status">Loading projects…</p>}
    {projectsState.status === 'error' && <>
      <p role="alert">Projects could not be loaded. Please try again.</p>
      <button type="button" onClick={() => {
        setProjectsState({ status: 'loading' })
        setAttempt(value => value + 1)
      }}>Retry</button>
    </>}
    {projectsState.status === 'ready' && !projects.length && <p>No active projects are available.</p>}
    {!!projects.length && <ReportForm projects={projects}
      initialProjectId={projects.some(project => project.id === selected) ? selected : ''}
      pending={pending} error={error} fieldErrors={fieldErrors} archivedProjectId={archivedProjectId}
      onSubmit={input => { void save(input) }}
      onCancel={projectId => {
        void navigate(projects.some(project => project.id === projectId) ? `/projects/${projectId}` : '/projects')
      }} />}
  </section>
}
