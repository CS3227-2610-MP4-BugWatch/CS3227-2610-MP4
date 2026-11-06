import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { SessionUser } from '../projects/types'
import type { DraftSummary, ReportRepository } from './types'

export function DraftListPage({ repository, user }: { repository: ReportRepository; user: SessionUser }) {
  const [drafts, setDrafts] = useState<DraftSummary[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (user.role !== 'tester') return
    let current = true
    repository.listDrafts().then(result => {
      if (current) { setDrafts(result); setStatus('ready') }
    }).catch(() => { if (current) setStatus('error') })
    return () => { current = false }
  }, [repository, user.role, attempt])
  async function remove(id: string) {
    if (deleting || !window.confirm('Delete this draft?')) return
    setDeleting(id); setError('')
    try { await repository.deleteDraft(id); setDrafts(previous => previous.filter(draft => draft.id !== id)) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Draft could not be deleted.') }
    finally { setDeleting(null) }
  }
  if (user.role !== 'tester') return <section className="project-panel"><h2>Tester access required</h2><Link to="/projects">Back to projects</Link></section>
  const groups = new Map<string, DraftSummary[]>()
  for (const draft of drafts) groups.set(draft.projectId, [...(groups.get(draft.projectId) ?? []), draft])
  return <section className="project-panel">
    <h2>My drafts</h2><Link to="/projects">Back to projects</Link>
    {status === 'loading' && <p role="status">Loading drafts…</p>}
    {status === 'error' && <><p role="alert">Drafts could not be loaded.</p><button onClick={() => { setStatus('loading'); setAttempt(value => value + 1) }}>Retry</button></>}
    {error && <p role="alert">{error}</p>}
    {status === 'ready' && !drafts.length && <p>No drafts yet.</p>}
    {[...groups.entries()].map(([projectId, group]) => <section key={projectId}>
      <h3>{group[0].projectName}{group[0].projectArchivedAt ? ' (Archived)' : ''}</h3>
      <ul>{group.map(draft => <li key={draft.id}>
        <Link to={`/drafts/${draft.id}`}>{draft.title || 'Untitled draft'}</Link>{' '}
        <button type="button" disabled={deleting !== null} onClick={() => { void remove(draft.id) }}>Delete</button>
      </li>)}</ul>
    </section>)}
  </section>
}
