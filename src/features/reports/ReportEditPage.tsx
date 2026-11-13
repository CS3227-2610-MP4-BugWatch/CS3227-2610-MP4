import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { Project, ProjectRepository, SessionUser } from '../projects/types'
import { ReportForm } from './ReportForm'
import { ReportError } from './types'
import type { Report, ReportEditRequest, ReportFieldErrors, ReportInput, ReportRepository, ReportSeverityConflict } from './types'

type Props = { projectRepository: ProjectRepository; reportRepository: ReportRepository; user: SessionUser }
type Read = { status: 'loading' | 'error' | 'missing' } | { status: 'ready'; report: Report; projects: Project[] }

export function ReportEditPage(props: Props) {
  const { reportId = '' } = useParams()
  return <Editor key={`${props.user.id}:${props.user.role}:${reportId}`} {...props} reportId={reportId} />
}

function Editor({ projectRepository, reportRepository, user, reportId }: Props & { reportId: string }) {
  const navigate = useNavigate()
  const [state, setState] = useState<Read>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ReportFieldErrors>({})
  const [conflict, setConflict] = useState<ReportSeverityConflict>()
  const revision = useRef(0)
  const active = useRef(false)
  const locked = useRef(false)
  const receipt = useRef<ReportEditRequest | null>(null)
  const allowNavigation = useRef(false)
  useEffect(() => {
    active.current = true
    let current = true
    if (user.role === 'tester') Promise.all([reportRepository.getReport(reportId), projectRepository.listActiveProjects()]).then(([report, projects]) => {
      if (!current) return
      if (!report) { setState({ status: 'missing' }); return }
      revision.current = report.severityRevision
      setState({ status: 'ready', report, projects: projects.filter(project => !project.archivedAt) })
    }).catch(() => { if (current) setState({ status: 'error' }) })
    return () => { current = false; active.current = false }
  }, [reportId, user.role, projectRepository, reportRepository, attempt])
  async function save(input: ReportInput) {
    if (locked.current || state.status !== 'ready') return
    locked.current = true
    setPending(true); setError(''); setFieldErrors({})
    const previous = receipt.current
    const request = previous && previous.expectedSeverityRevision === revision.current && JSON.stringify(previous.input) === JSON.stringify(input)
      ? previous : { input, expectedSeverityRevision: revision.current, requestId: crypto.randomUUID() }
    receipt.current = request
    try {
      const result = await reportRepository.editReport(reportId, request)
      if (active.current) { allowNavigation.current = true; void navigate(`/reports/${result.report.id}`) }
    } catch (reason) {
      if (!active.current) return
      if (reason instanceof ReportError && reason.code === 'severity_conflict' && reason.severityConflict) {
        revision.current = reason.severityConflict.latestSeverityRevision
        setConflict({ ...reason.severityConflict }); receipt.current = null
      } else if (reason instanceof ReportError && reason.code !== 'unavailable') {
        setError(reason.message); setFieldErrors(reason.fieldErrors ?? {}); receipt.current = null
      } else setError('We couldn’t confirm whether your changes were saved. Try again to safely retry this save.')
    } finally { locked.current = false; if (active.current) setPending(false) }
  }
  if (user.role !== 'tester') return <section className="project-panel"><h2>Tester access required</h2><Link to={`/reports/${reportId}`}>Back to report</Link></section>
  if (state.status === 'loading') return <p role="status">Loading report editor…</p>
  if (state.status === 'error') return <section className="project-panel"><p role="alert">Report editor could not be loaded.</p><button onClick={() => { setState({ status: 'loading' }); setAttempt(value => value + 1) }}>Retry</button></section>
  if (state.status === 'missing') return <section className="project-panel"><h2>Report not found</h2><Link to="/projects">Back to projects</Link></section>
  if (state.status !== 'ready') return null
  const { report, projects } = state
  if (report.reporterId !== user.id || report.projectArchivedAt || !['Open', 'Accepted', 'In progress', 'Awaiting tester information'].includes(report.state) || !Number.isInteger(report.severityRevision) || report.severityRevision < 0) return <section className="project-panel"><h2>Report cannot be edited</h2><p>Only the original reporting Tester can edit an eligible report in an active project.</p><Link to={`/reports/${reportId}`}>Back to report</Link></section>
  const input: ReportInput = { projectId: report.projectId, title: report.title, description: report.description, version: report.version, reproductionSteps: report.reproductionSteps, expectedResults: report.expectedResults, actualResults: report.actualResults, severity: report.severity, testEnvironment: report.testEnvironment }
  return <section className="project-panel report-edit-page"><h2>Edit report</h2><p>Save your corrections to this report. Its discussion, assignment and state are preserved.</p>
    <ReportForm mode="edit" projects={projects} initialProjectId={report.projectId} initialInput={input} projectsAvailable={true} pending={pending} error={error} fieldErrors={fieldErrors} archivedProjectId="" savedInput={null} isDraft={false} confirmation="" allowNavigation={allowNavigation} severityConflict={conflict} onSubmit={value => { void save(value) }} onSaveDraft={() => {}} onCancel={() => { void navigate(`/reports/${reportId}`) }} />
  </section>
}
