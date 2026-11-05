import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import type { Project, ProjectHistoryEntry, ProjectRepository, SessionUser } from './types'

export function ProjectDetailsPage({ repository, user }: { repository: ProjectRepository; user: SessionUser }) {
  const { projectId = '' } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [history, setHistory] = useState<ProjectHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const current = await repository.getProject(projectId)
        const entries = current ? await repository.listProjectHistory(projectId) : []
        if (active) { setProject(current); setHistory(entries); setLoading(false); setError('') }
      } catch (reason) {
        if (active) { setError(reason instanceof Error ? reason.message : 'Project could not be loaded.'); setLoading(false) }
      }
    }
    void load()
    return () => { active = false }
  }, [repository, projectId, attempt])

  function actorLabel(id: string) { return id === user.id ? user.displayName : id }

  function historyActorLabel(entry: ProjectHistoryEntry) {
    return entry.actorDisplayName?.trim()
      || (entry.actorId === user.id ? user.displayName.trim() : '')
      || 'Unknown user'
  }

  return <section className="project-panel">
    <div className="project-toolbar"><Link to="/projects">Back to projects</Link>
      {!loading && !error && project && project.archivedAt === null && user.role === 'developer'
        && <Link to={`/projects/${project.id}/edit`}>Edit project</Link>}
      {!loading && !error && project && project.archivedAt === null && user.role === 'tester'
        && <Link to={`/reports/new?projectId=${encodeURIComponent(project.id)}`}>Report bug</Link>}
    </div>
    {loading ? <p role="status">Loading project…</p> : error ? <div role="alert"><p>{error}</p>
      <button onClick={() => { setLoading(true); setError(''); setAttempt(value => value + 1) }}>Retry</button></div>
      : !project ? <><h2>Project not found</h2><p>The requested project does not exist.</p></>
        : <>
          <h2>{project.name}</h2>
          {project.archivedAt !== null && <p role="status">This project is archived and read-only.</p>}
          <p className="project-description">{project.description}</p>
          <p><a href={project.repositoryUrl} target="_blank" rel="noreferrer">{project.repositoryUrl}</a></p>
          <p className="project-metadata">Created by {actorLabel(project.createdBy)} · Revision {project.revision}</p>
          <h3>Project history</h3>
          {history.length === 0 ? <p>No project history is available.</p> : <ol className="project-history">
            {history.map(entry => <li key={entry.id}>
              <p><strong>{historyActorLabel(entry)}</strong> {entry.event === 'created' ? 'created this project' : 'edited this project'} · <time dateTime={entry.occurredAt}>{new Date(entry.occurredAt).toLocaleString()}</time></p>
              <dl>{Object.entries(entry.changes).map(([name, change]) => change && <div key={name}>
                <dt>{name === 'repositoryUrl' ? 'Repository URL' : name === 'name' ? 'Name' : 'Description'}</dt>
                <dd>{change.before === null ? 'Initial value' : `Previously: ${change.before}`}<br />Now: {change.after}</dd>
              </div>)}</dl>
            </li>)}
          </ol>}
        </>}
  </section>
}
