import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { SessionUser } from '../projects/types'
import type { MailboxItem, MailboxRepository } from './types'
import { REPORT_TEXT_FIELDS } from '../reports/validation'

type Props = { repository: MailboxRepository; user: SessionUser }
export function MailboxPage(props: Props) {
  return <Mailbox key={`${props.user.id}:${props.user.role}`} {...props} />
}
function Mailbox({ repository }: Props) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [state, setState] = useState<{ status: 'loading' | 'error' } | { status: 'ready'; items: MailboxItem[] }>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const scope = useRef({ active: false, generation: 0, locked: false })
  useEffect(() => {
    const request = scope.current
    request.active = true
    const generation = ++request.generation
    repository.listItems(filter).then(items => {
      if (request.active && request.generation === generation) setState({ status: 'ready', items })
    }).catch(() => { if (request.active && request.generation === generation) setState({ status: 'error' }) })
    return () => { request.active = false; request.generation++ }
  }, [repository, filter, attempt])
  async function act(item: MailboxItem, action: 'read' | 'open' | 'delete') {
    const request = scope.current
    if (request.locked) return
    request.locked = true; setPending(item.id); setError('')
    const generation = request.generation
    try {
      if (action === 'delete') await repository.deleteItem(item.id)
      else await repository.markRead(item.id)
      if (!request.active || generation !== request.generation) return
      setState(previous => previous.status === 'ready' ? { status: 'ready', items: previous.items.flatMap(value => value.id !== item.id ? [value] : action === 'delete' || filter === 'unread' ? [] : [{ ...value, readAt: value.readAt ?? new Date().toISOString() }]) } : previous)
      if (action === 'open') void navigate(`/reports/${item.reportId}`)
    } catch {
      if (request.active && generation === request.generation) setError(action === 'delete' ? 'We couldn’t confirm whether this item was deleted. Retry deletion or reload your mailbox.' : 'Read status could not be saved. Please try again.')
    } finally { request.locked = false; if (request.active) setPending('') }
  }
  function reload() { setState({ status: 'loading' }); setError(''); setAttempt(value => value + 1) }
  return <section className="project-panel mailbox-page"><h2>Mailbox</h2><p>Report updates that need your attention.</p>
    <div className="project-toolbar" aria-label="Mailbox filters">{(['all', 'unread'] as const).map(value => <button key={value} aria-pressed={filter === value} disabled={!!pending} onClick={() => { if (filter === value) return; setState({ status: 'loading' }); setError(''); setFilter(value) }}>{value === 'all' ? 'All' : 'Unread'}</button>)}<button disabled={!!pending} onClick={reload}>Reload mailbox</button></div>
    {error && <p role="alert">{error}</p>}
    {state.status === 'loading' && <p role="status">Loading mailbox…</p>}
    {state.status === 'error' && <div><p role="alert">Mailbox could not be loaded.</p><button onClick={reload}>Retry</button></div>}
    {state.status === 'ready' && (!state.items.length ? <p>{filter === 'unread' ? 'No unread items.' : 'Your mailbox is empty.'}</p> : <ul className="mailbox-items">{state.items.map(item => <li className="mailbox-item" key={item.id}>
      <p><strong>{item.actorDisplayName?.trim() || item.actorUsername?.trim() || 'Unavailable user'}</strong> edited a report</p>
      <h3>{item.reportTitle}</h3><p>{item.projectName}</p><p>{item.readAt ? 'Read' : 'Unread'} · <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></p>
      <p>Changed fields: {item.changedFields.map(field => field === 'projectId' ? 'Project' : field === 'severity' ? 'Severity' : REPORT_TEXT_FIELDS[field].label).join(', ')}</p>
      <div className="project-toolbar"><button disabled={!!pending} onClick={() => { void act(item, 'open') }}>Open report</button>{!item.readAt && <button disabled={!!pending} onClick={() => { void act(item, 'read') }}>Mark as read</button>}<button disabled={!!pending} onClick={() => { void act(item, 'delete') }}>Delete</button></div>
      {pending === item.id && <p role="status">Saving mailbox change…</p>}
    </li>)}</ul>)}
  </section>
}
