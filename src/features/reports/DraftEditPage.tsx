import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import type { ProjectRepository, SessionUser } from '../projects/types'
import type { ReportDraft, ReportRepository } from './types'
import { ReportCreatePage } from './ReportCreatePage'

export function DraftEditPage({ projectRepository, reportRepository, user, savedDrafts }: {
  projectRepository: ProjectRepository; reportRepository: ReportRepository; user: SessionUser; savedDrafts?: Map<string, ReportDraft>
}) {
  const { draftId = '' } = useParams()
  const location = useLocation()
  const [saved] = useState(() => location.state?.draftSaved ? savedDrafts?.get(draftId) : undefined)
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'missing' } | { status: 'ready'; draft: ReportDraft }>(saved ? { status: 'ready', draft: saved } : { status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (user.role !== 'tester') return
    if (saved) { savedDrafts?.delete(draftId); return }
    let current = true
    reportRepository.getDraft(draftId).then(draft => {
      if (current) setState(draft ? { status: 'ready', draft } : { status: 'missing' })
    }).catch(() => { if (current) setState({ status: 'error' }) })
    return () => { current = false }
  }, [draftId, reportRepository, user.role, attempt, saved, savedDrafts])
  if (user.role !== 'tester') return <section className="project-panel"><h2>Tester access required</h2><Link to="/projects">Back to projects</Link></section>
  if (state.status === 'loading') return <p role="status">Loading draft…</p>
  if (state.status === 'missing') return <section className="project-panel"><h2>Draft not found</h2><Link to="/drafts">My drafts</Link></section>
  if (state.status === 'error') return <section className="project-panel"><p role="alert">Draft could not be loaded.</p><button onClick={() => { setState({ status: 'loading' }); setAttempt(value => value + 1) }}>Retry</button></section>
  return <ReportCreatePage projectRepository={projectRepository} reportRepository={reportRepository} user={user} draft={state.draft} />
}
