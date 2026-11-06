import { Badge } from '@mantine/core'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { ProjectReportSummary, ReportRepository } from './types'
import { REPORT_SEVERITIES } from './validation'

type ListState = { status: 'loading' | 'error' } | { status: 'ready'; reports: ProjectReportSummary[] }

export function ProjectReportsPanel({ projectId, repository }: { projectId: string; repository: ReportRepository }) {
  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    repository.listProjectReports(projectId).then(reports => {
      if (active) setState({ status: 'ready', reports })
    }).catch(() => {
      if (active) setState({ status: 'error' })
    })
    return () => { active = false }
  }, [repository, projectId, attempt])

  return <section aria-labelledby="project-reports-title">
    <h3 id="project-reports-title">Bug reports</h3>
    {state.status === 'loading' && <p role="status">Loading reports…</p>}
    {state.status === 'error' && <div role="alert">
      <p>Reports could not be loaded.</p>
      <button type="button" onClick={() => {
        setState({ status: 'loading' })
        setAttempt(value => value + 1)
      }}>Retry</button>
    </div>}
    {state.status === 'ready' && (state.reports.length === 0
      ? <p>No reports yet.</p>
      : <div className="project-report-table">
        <table aria-label="Submitted bug reports">
          <thead><tr>
            <th scope="col">Title</th><th scope="col">Project</th><th scope="col">Severity</th>
            <th scope="col">Status</th><th scope="col">Assignee</th><th scope="col">Reporter</th>
          </tr></thead>
          <tbody>{state.reports.map(report => <tr key={report.id}>
            <td data-label="Title"><Link to={`/reports/${report.id}`}>{report.title}</Link></td>
            <td data-label="Project">{report.projectName}</td><td data-label="Severity"><Badge variant="light" color={report.severity === 'high' ? 'red' : 'gray'}>{REPORT_SEVERITIES[report.severity]}</Badge></td>
            <td data-label="Status"><Badge variant="light">{report.state}</Badge></td><td data-label="Assignee">Unassigned</td><td data-label="Reporter">{report.reporterDisplayName}</td>
          </tr>)}</tbody>
        </table>
      </div>)}
  </section>
}
