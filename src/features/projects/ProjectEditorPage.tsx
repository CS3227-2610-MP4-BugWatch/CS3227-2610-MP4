import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ProjectForm } from './ProjectForm'
import { ProjectError } from './types'
import type { Project, ProjectInput, ProjectRepository, SessionUser } from './types'

const EMPTY_INPUT: ProjectInput = { name: '', description: '', repositoryUrl: '' }

export function ProjectEditorPage({ repository, user }: { repository: ProjectRepository; user: SessionUser }) {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(Boolean(projectId))
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProjectInput, string>>>({})
  const [conflict, setConflict] = useState(false)
  const [formVersion, setFormVersion] = useState(0)
  const active = useRef(true)
  const saveLock = useRef(false)

  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])

  useEffect(() => {
    if (!projectId || user.role !== 'developer') return
    let current = true
    repository.getProject(projectId).then(result => {
      if (current) { setProject(result); setLoading(false); setLoadError('') }
    }).catch(reason => {
      if (current) { setLoadError(reason instanceof Error ? reason.message : 'Project could not be loaded.'); setLoading(false) }
    })
    return () => { current = false }
  }, [repository, projectId, user.role, attempt])

  async function save(input: ProjectInput) {
    if (saveLock.current || conflict || user.role !== 'developer') return
    saveLock.current = true
    setPending(true)
    setError('')
    setFieldErrors({})
    try {
      const saved = project
        ? await repository.updateProject(project.id, project.revision, input)
        : await repository.createProject(input)
      if (active.current) void navigate(`/projects/${saved.id}`)
    } catch (reason) {
      if (active.current) {
        setError(reason instanceof Error ? reason.message : 'The project could not be saved. Please try again.')
        if (reason instanceof ProjectError) {
          setFieldErrors(reason.fieldErrors ?? {})
          setConflict(reason.code === 'conflict')
        }
      }
    } finally {
      saveLock.current = false
      if (active.current) setPending(false)
    }
  }

  async function reload() {
    if (!projectId || saveLock.current) return
    saveLock.current = true
    setPending(true)
    try {
      const current = await repository.getProject(projectId)
      if (active.current) {
        setProject(current)
        setConflict(false)
        setFieldErrors({})
        setError('Latest values loaded. Review your changes before saving.')
        setFormVersion(value => value + 1)
      }
    } catch (reason) {
      if (active.current) setError(reason instanceof Error ? reason.message : 'The latest project could not be loaded.')
    } finally {
      saveLock.current = false
      if (active.current) setPending(false)
    }
  }

  if (user.role !== 'developer') return <section className="project-panel"><h2>Developer access required</h2>
    <p>Only developers can create or edit projects.</p><Link to="/projects">Back to projects</Link></section>
  if (loading) return <section className="project-panel"><p role="status">Loading project…</p></section>
  if (loadError) return <section className="project-panel"><p role="alert">{loadError}</p>
    <button onClick={() => { setLoading(true); setLoadError(''); setAttempt(value => value + 1) }}>Retry</button>
    <Link to="/projects">Back to projects</Link></section>
  if (projectId && !project) return <section className="project-panel"><h2>Project not found</h2>
    <p>The requested project does not exist.</p><Link to="/projects">Back to projects</Link></section>
  if (project?.archivedAt != null) return <section className="project-panel"><h2>Project is archived</h2>
    <p>Archived projects cannot be edited.</p><Link to={`/projects/${project.id}`}>View project</Link></section>

  return <section className="project-panel"><h2>{projectId ? 'Edit project' : 'Create project'}</h2>
    {conflict && <div className="project-message"><p>Another save changed this project. Reload before saving again. Reloading discards your unsaved text.</p>
      <button type="button" disabled={pending} onClick={() => { void reload() }}>Reload latest project</button></div>}
    <ProjectForm key={formVersion} initialValue={project ?? EMPTY_INPUT} pending={pending} error={error}
      fieldErrors={fieldErrors} blocked={conflict} onSubmit={input => { void save(input) }}
      onCancel={() => { void navigate(projectId ? `/projects/${projectId}` : '/projects') }} />
  </section>
}
