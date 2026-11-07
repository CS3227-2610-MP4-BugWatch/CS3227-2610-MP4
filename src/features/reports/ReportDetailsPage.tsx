import { Badge } from '@mantine/core'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import type { Report, ReportHistoryEntry, ReportInput, ReportRepository, ReportSeverity } from './types'
import { REPORT_SEVERITIES, REPORT_TEXT_FIELDS, REPORT_TEXT_KEYS } from './validation'

type ReadState =
  | { status: 'loading' | 'missing' | 'error' }
  | { status: 'ready'; report: Report; history: ReportHistoryEntry[] }

function dateLabel(value: string) {
  return new Date(value).toLocaleString()
}

function historyLabel(field: keyof ReportInput) {
  if (field === 'projectId') return 'Project'
  if (field === 'severity') return 'Severity'
  return REPORT_TEXT_FIELDS[field].label
}

export function ReportDetailsPage({ reportRepository }: { reportRepository: ReportRepository }) {
  const { reportId } = useParams()
  const [state, setState] = useState<ReadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    async function load() {
      try {
        const report = reportId ? await reportRepository.getReport(reportId) : null
        if (!current) return
        if (!report) { setState({ status: 'missing' }); return }
        const history = await reportRepository.listReportHistory(report.id)
        if (current) setState({ status: 'ready', report, history })
      } catch {
        if (current) setState({ status: 'error' })
      }
    }
    void load()
    return () => { current = false }
  }, [reportId, reportRepository, attempt])

  return <section className="project-panel">
    {state.status !== 'ready' && <Link to="/projects">Back to projects</Link>}
    {state.status === 'loading' && <p role="status">Loading report…</p>}
    {state.status === 'missing' && <h2>Report not found</h2>}
    {state.status === 'error' && <>
      <p role="alert">The report could not be loaded. Please try again.</p>
      <button type="button" onClick={() => {
        setState({ status: 'loading' })
        setAttempt(value => value + 1)
      }}>Retry</button>
    </>}
    {state.status === 'ready' && <SavedReport report={state.report} history={state.history} />}
  </section>
}

function SavedReport({ report, history }: { report: Report; history: ReportHistoryEntry[] }) {
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
      <div><dt>Project</dt><dd><Link to={`/projects/${report.projectId}`}>{report.projectName}</Link></dd></div>
      <div><dt>Reporter</dt><dd>{report.reporterDisplayName.trim() || report.reporterUsername}</dd></div>
      <div><dt>State</dt><dd><Badge variant="light">{report.state}</Badge></dd></div>
      <div><dt>Assigned developer</dt><dd>Unassigned</dd></div>
      <div><dt>Created</dt><dd><time dateTime={report.createdAt}>{dateLabel(report.createdAt)}</time></dd></div>
      <div><dt>Updated</dt><dd><time dateTime={report.updatedAt}>{dateLabel(report.updatedAt)}</time></dd></div>
      <div><dt>Severity</dt><dd><Badge variant="light" color={report.severity === 'high' ? 'red' : 'gray'}>{REPORT_SEVERITIES[report.severity]}</Badge></dd></div>
    </dl>
    <h3>Report details</h3>
    <dl>
      {REPORT_TEXT_KEYS.filter(key => key !== 'title').map(key => <div key={key}>
        <dt>{REPORT_TEXT_FIELDS[key].label}</dt><dd className="project-description">{report[key] || 'Not provided'}</dd>
      </div>)}
    </dl>
    <h3>Creation history</h3>
    {history.length ? <ol className="project-history">{history.map(entry => <li key={entry.id}>
      <p>{entry.actorDisplayName?.trim() || (entry.actorId === report.reporterId
        ? report.reporterDisplayName.trim() || report.reporterUsername : 'Unknown user')} created this report on{' '}
      <time dateTime={entry.occurredAt}>{dateLabel(entry.occurredAt)}</time>.</p>
      <dl>{(Object.keys(entry.changes) as (keyof ReportInput)[]).map(field => {
        const value = entry.changes[field]?.after ?? ''
        const label = field === 'projectId' && value === report.projectId ? report.projectName
          : field === 'severity' && Object.hasOwn(REPORT_SEVERITIES, value)
            ? REPORT_SEVERITIES[value as ReportSeverity] : value
        return <div key={field}><dt>{historyLabel(field)}</dt><dd className="project-description">{label || 'Not provided'}</dd></div>
      })}</dl>
    </li>)}</ol> : <p>No creation history is available.</p>}
  </>
}
