import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { Project, ProjectRepository, SessionUser } from './types'

export function ProjectListPage({ repository, user }: { repository: ProjectRepository; user: SessionUser }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    repository.listActiveProjects().then(result => {
      if (active) { setProjects(result); setError(''); setLoading(false) }
    }).catch(reason => {
      if (active) { setError(reason instanceof Error ? reason.message : 'Projects could not be loaded.'); setLoading(false) }
    })
    return () => { active = false }
  }, [repository, attempt])

  function retry() {
    setLoading(true)
    setError('')
    setAttempt(current => current + 1)
  }

  return <section className="project-panel">
    <div className="project-toolbar"><h2>Active projects</h2>
      {user.role === 'developer' && <Link to="/projects/new">Create project</Link>}
    </div>
    <p className="page-intro">Browse active projects and follow their bug reports.</p>
    {loading && <p role="status">Loading projects…</p>}
    {!loading && error && <div role="alert"><p>{error}</p><button onClick={retry}>Retry</button></div>}
    {!loading && !error && (projects.length === 0
      ? <p>No active projects yet. A developer can create the first one.</p>
      : <ul className="project-list">{projects.map(project => <li key={project.id}>
        <Link className="project-link" to={`/projects/${project.id}`}>{project.name}</Link>
        <p>{project.description}</p>
        <small>Created by {project.createdBy === user.id ? user.displayName : project.createdBy}</small>
      </li>)}</ul>)}
  </section>
}
