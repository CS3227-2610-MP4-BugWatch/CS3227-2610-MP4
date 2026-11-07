import { Badge, Button, Group } from '@mantine/core'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import type { SessionUser } from '../projects/types'
import { ReportError } from './types'
import type { Report, ReportHistoryEntry, ReportInput, ReportRepository, ReportSeverity } from './types'
import { REPORT_SEVERITIES, REPORT_TEXT_FIELDS, REPORT_TEXT_KEYS } from './validation'

type ReadState =
  | { status: 'loading' | 'missing' | 'error' }
  | { status: 'ready'; report: Report; history: ReportHistoryEntry[] }

type DetailProps = { reportRepository: ReportRepository; user: SessionUser }

function dateLabel(value: string) {
  return new Date(value).toLocaleString()
}

function identityLabel(displayName?: string | null, username?: string | null) {
  return displayName?.trim() || username?.trim() || 'Unavailable user'
}

function historyLabel(field: keyof ReportInput) {
  if (field === 'projectId') return 'Project'
  if (field === 'severity') return 'Severity'
  return REPORT_TEXT_FIELDS[field].label
}

export function ReportDetailsPage(props: DetailProps) {
  const { reportId } = useParams()
  return <ReportDetails key={`${reportId}:${props.user.id}:${props.user.role}`} {...props} reportId={reportId} />
}

function ReportDetails({ reportRepository, user, reportId }: DetailProps & { reportId?: string }) {
  const [state, setState] = useState<ReadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const request = useRef({ generation: 0, pending: false })

  useEffect(() => {
    const scope = request.current
    const generation = ++scope.generation
    async function load() {
      try {
        const report = reportId ? await reportRepository.getReport(reportId) : null
        if (scope.generation !== generation) return
        if (!report) { setState({ status: 'missing' }); return }
        const history = await reportRepository.listReportHistory(report.id)
        if (scope.generation === generation) {
          setState({ status: 'ready', report, history })
          setUncertain(false)
        }
      } catch {
        if (scope.generation === generation) setState({ status: 'error' })
      }
    }
    void load()
    return () => { scope.generation++ }
  }, [reportId, reportRepository, attempt])

  function reload() {
    setState({ status: 'loading' })
    setAttempt(value => value + 1)
  }

  async function act(action: 'accept' | 'start') {
    if (request.current.pending || state.status !== 'ready' || uncertain) return
    request.current.pending = true
    const generation = request.current.generation
    setPending(true)
    setFeedback('')
    try {
      if (action === 'accept') await reportRepository.acceptReport(state.report.id)
      else await reportRepository.startInvestigation(state.report.id)
      if (request.current.generation !== generation) return
      setFeedback(action === 'accept' ? 'Report accepted. Reloading the saved report.' : 'Investigation started. Reloading the saved report.')
      setUncertain(true)
      reload()
    } catch (error) {
      if (request.current.generation !== generation) return
      if (error instanceof ReportError && ['already_assigned', 'state_conflict', 'archived'].includes(error.code)) {
        setFeedback(error.message)
        setUncertain(true)
        reload()
      } else if (error instanceof ReportError && ['forbidden', 'not_found', 'validation', 'unauthenticated'].includes(error.code)) {
        setFeedback(error.message)
        setUncertain(true)
      } else {
        setFeedback('The action could not be confirmed. It may have been saved. Reload the report before trying another action.')
        setUncertain(true)
      }
    } finally {
      if (request.current.generation === generation) {
        request.current.pending = false
        setPending(false)
      }
    }
  }

  const report = state.status === 'ready' ? state.report : null
  const eligible = report && user.role === 'developer' && !report.projectArchivedAt
  const canAccept = eligible && report.state === 'Open' && report.assignedDeveloperId === null
  const canStart = eligible && report.state === 'Accepted' && report.assignedDeveloperId?.toLowerCase() === user.id.toLowerCase()

  return <section className="project-panel">
    {state.status !== 'ready' && <Button component={Link} to="/projects" variant="default">Back to projects</Button>}
    {feedback && <p role="alert">{feedback}</p>}
    {state.status === 'loading' && <p role="status">Loading report…</p>}
    {state.status === 'missing' && <h2>Report not found</h2>}
    {state.status === 'error' && <>
      <p role="alert">The report could not be loaded. If an action was submitted, it may have been saved. Reload to check the current report.</p>
      <Button type="button" variant="default" onClick={reload}>{feedback ? 'Reload' : 'Retry'}</Button>
    </>}
    {state.status === 'ready' && <>
      <SavedReport report={state.report} history={state.history}>
      {(canAccept || canStart) && <Group className="project-actions" role="group" aria-label="Report actions" aria-busy={pending} gap="sm">
        {canAccept && <Button type="button" disabled={pending || uncertain} onClick={() => void act('accept')}>Accept report</Button>}
        {canStart && <Button type="button" disabled={pending || uncertain} onClick={() => void act('start')}>Start investigation</Button>}
        {pending && <p role="status">Saving report action…</p>}
      </Group>}
      {uncertain && !pending && <Button type="button" variant="default" mb="md" onClick={reload}>Reload</Button>}
      </SavedReport>
    </>}
  </section>
}

function SavedReport({ report, history, children }: { report: Report; history: ReportHistoryEntry[]; children: ReactNode }) {
  const projectPath = `/projects/${report.projectId}`
  const reportsPath = `${projectPath}?tab=reports`
  return <>
    <nav aria-label="Breadcrumb">
      <Link to="/projects">Projects</Link> {' / '}
      <Link to={projectPath}>{report.projectName}</Link> {' / '}
      <Link to={reportsPath}>Reports</Link> {' / '}
      <span aria-current="page">{report.title}</span>
    </nav>
    <p><Link to={reportsPath}><span aria-hidden="true">← </span>Back to project reports</Link></p>
    <h2>{report.title}</h2>
    <dl className="report-facts">
      <div><dt>Project</dt><dd><Link to={projectPath}>{report.projectName}</Link></dd></div>
      <div><dt>Reporter</dt><dd>{identityLabel(report.reporterDisplayName, report.reporterUsername)}</dd></div>
      <div><dt>State</dt><dd><Badge variant="light" color={report.state === 'Open' ? 'gray' : report.state === 'Accepted' ? 'blue' : 'orange'}>{report.state}</Badge></dd></div>
      <div><dt>Assigned developer</dt><dd>{report.assignedDeveloperId ? identityLabel(report.assignedDeveloperDisplayName, report.assignedDeveloperUsername) : 'Unassigned'}</dd></div>
      {report.assignedAt && <div><dt>Assigned</dt><dd><time dateTime={report.assignedAt}>{dateLabel(report.assignedAt)}</time></dd></div>}
      <div><dt>Created</dt><dd><time dateTime={report.createdAt}>{dateLabel(report.createdAt)}</time></dd></div>
      <div><dt>Updated</dt><dd><time dateTime={report.updatedAt}>{dateLabel(report.updatedAt)}</time></dd></div>
      <div><dt>Severity</dt><dd><Badge variant="light" color={report.severity === 'high' ? 'red' : 'gray'}>{REPORT_SEVERITIES[report.severity]}</Badge></dd></div>
    </dl>
    {children}
    <h3>Report details</h3>
    <dl>
      {REPORT_TEXT_KEYS.filter(key => key !== 'title').map(key => <div key={key}>
        <dt>{REPORT_TEXT_FIELDS[key].label}</dt><dd className="project-description">{report[key] || 'Not provided'}</dd>
      </div>)}
    </dl>
    <h3>Activity history</h3>
    {history.length ? <ol className="project-history">{history.map(entry => <li key={entry.id}>
      <p><strong>{identityLabel(entry.actorDisplayName, entry.actorUsername || (entry.actorId === report.reporterId ? report.reporterUsername : null))}</strong>{' '}
        {entry.event === 'created' ? 'created this report' : entry.event === 'accepted' ? 'accepted this report' : 'started investigation'} on{' '}
        <time dateTime={entry.occurredAt}>{dateLabel(entry.occurredAt)}</time>.</p>
      <HistoryChanges entry={entry} report={report} />
    </li>)}</ol> : <p>No activity history is available.</p>}
  </>
}

function HistoryChanges({ entry, report }: { entry: ReportHistoryEntry; report: Report }) {
  if (entry.event !== 'created') return <dl>
    <div><dt>State</dt><dd>{entry.changes.state.before} → {entry.changes.state.after}</dd></div>
    {entry.event === 'accepted' && <>
      <div><dt>Assigned developer</dt><dd>Unassigned → {identityLabel(entry.assignedDeveloperDisplayName, entry.assignedDeveloperUsername)}</dd></div>
      <div><dt>Assigned</dt><dd><time dateTime={entry.changes.assignedAt.after}>{dateLabel(entry.changes.assignedAt.after)}</time></dd></div>
    </>}
  </dl>
  return <dl>{(Object.keys(entry.changes) as (keyof ReportInput)[]).map(field => {
    const value = entry.changes[field]?.after ?? ''
    const label = field === 'projectId' && value === report.projectId ? report.projectName
      : field === 'severity' && Object.hasOwn(REPORT_SEVERITIES, value) ? REPORT_SEVERITIES[value as ReportSeverity] : value
    return <div key={field}><dt>{historyLabel(field)}</dt><dd className="project-description">{label || 'Not provided'}</dd></div>
  })}</dl>
}
