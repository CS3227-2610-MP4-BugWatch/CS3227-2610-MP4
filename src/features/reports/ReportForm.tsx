import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useBlocker } from 'react-router'
import type { Project } from '../projects/types'
import type { ReportFieldErrors, ReportInput } from './types'
import { REPORT_SEVERITIES, REPORT_TEXT_FIELDS, validateDraftInput, validateReportInput } from './validation'

type Props = {
  projects: Project[]; initialProjectId: string; initialInput?: ReportInput; projectsAvailable: boolean
  pending: boolean; error: string; fieldErrors: ReportFieldErrors; archivedProjectId: string; archivedProjectName?: string
  savedInput: ReportInput | null; isDraft: boolean; confirmation: string; allowNavigation: React.RefObject<boolean>
  onSubmit: (input: ReportInput) => void; onSaveDraft: (input: ReportInput) => void; onCancel: (projectId: string) => void
}

export function ReportForm({ projects, initialProjectId, initialInput, projectsAvailable, pending, error, fieldErrors, archivedProjectId, archivedProjectName, savedInput, isDraft, confirmation, allowNavigation, onSubmit, onSaveDraft, onCancel }: Props) {
  const [input, setInput] = useState<ReportInput>(initialInput ?? {
    projectId: initialProjectId, title: '', description: '', version: '', reproductionSteps: '',
    expectedResults: '', actualResults: '', severity: '', testEnvironment: '',
  })
  const [initial] = useState(input)
  const [lastSavedInput, setLastSavedInput] = useState(savedInput)
  if (lastSavedInput !== savedInput) {
    setLastSavedInput(savedInput)
    if (savedInput) setInput(savedInput)
  }
  const [errors, setErrors] = useState<ReportFieldErrors>({})
  const [edited, setEdited] = useState<Partial<Record<keyof ReportInput, boolean>>>({})
  const [lastFieldErrors, setLastFieldErrors] = useState(fieldErrors)
  const archived = archivedProjectId !== '' && input.projectId === archivedProjectId
  const dirty = JSON.stringify(input) !== JSON.stringify(savedInput ?? initial)
  const blocker = useBlocker(() => dirty && !allowNavigation.current)
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  if (lastFieldErrors !== fieldErrors) { setLastFieldErrors(fieldErrors); setEdited({}) }
  function change<K extends keyof ReportInput>(key: K, value: ReportInput[K]) {
    setInput(previous => ({ ...previous, [key]: value }))
    setErrors(previous => ({ ...previous, [key]: undefined }))
    setEdited(previous => ({ ...previous, [key]: true }))
  }
  function validate(saveDraft: boolean) {
    if (pending || archived || !projectsAvailable) return
    const result = saveDraft ? validateDraftInput(input) : validateReportInput(input)
    if (!result.valid) { setErrors(result.errors); return }
    if (!projects.some(project => project.id === result.value.projectId)) { setErrors({ projectId: 'Choose an active project.' }); return }
    setErrors({})
    if (saveDraft) onSaveDraft(result.value); else onSubmit(result.value)
  }
  function submit(event: FormEvent) { event.preventDefault(); validate(false) }
  function message(key: keyof ReportInput) { return errors[key] ?? (edited[key] ? undefined : fieldErrors[key]) }
  function field(key: keyof ReportInput, label: string, control: ReactNode) {
    const feedback = message(key)
    return <div className="project-field" key={key}><label htmlFor={key}>{label}</label>{control}{feedback && <p id={`${key}-error`}>{feedback}</p>}</div>
  }
  function accessibility(key: keyof ReportInput) { return { id: key, disabled: pending, 'aria-invalid': !!message(key), 'aria-describedby': message(key) ? `${key}-error` : undefined } }
  return <>
    {blocker.state === 'blocked' && <div role="dialog" aria-modal="true" aria-label="Unsaved changes"><p>You have unsaved changes.</p><button type="button" onClick={() => blocker.reset()}>Keep editing</button><button type="button" onClick={() => blocker.proceed()}>Leave without saving</button></div>}
    <form className="project-form" onSubmit={submit} noValidate>
      <p>All fields are required except Test environment.</p>
      {archived ? <div role="alert">{isDraft ? <p>This project has been archived. Select an active project to save or submit.</p> : <><p>This project has been archived. Your report wasn’t submitted.</p><p>If the bug still needs attention, contact the Developer who created this project outside BugWatch.</p></>}</div> : error && <p role="alert">{error}</p>}
      {confirmation && <p role="status">{confirmation}</p>}
      {field('projectId', 'Project', <select {...accessibility('projectId')} required value={input.projectId} onChange={event => change('projectId', event.target.value)}>
        <option value="">Choose a project</option>
        {input.projectId && !projects.some(project => project.id === input.projectId) && <option value={input.projectId}>{archivedProjectName ?? (archived ? 'Archived project' : 'Selected project')}{archived ? ' (Archived)' : ''}</option>}
        {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>)}
      {[
        { title: 'Identify the problem', keys: ['title', 'description', 'version'] as const },
        { title: 'Reproduce the problem', keys: ['reproductionSteps', 'testEnvironment'] as const },
        { title: 'Expected and actual results', keys: ['expectedResults', 'actualResults'] as const },
      ].map(group => <fieldset className="form-section" key={group.title}><legend>{group.title}</legend>{group.keys.map(key => {
        const props = { ...accessibility(key), required: key !== 'testEnvironment', value: input[key] ?? '', onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(key, event.target.value) }
        return field(key, REPORT_TEXT_FIELDS[key].label, key === 'title' || key === 'version' ? <input type="text" {...props} /> : <textarea rows={4} {...props} />)
      })}</fieldset>)}
      <fieldset className="form-section"><legend>Impact</legend>
      {field('severity', 'Severity', <select {...accessibility('severity')} required value={input.severity} onChange={event => change('severity', event.target.value as ReportInput['severity'])}><option value="">Choose a severity</option>{Object.entries(REPORT_SEVERITIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>)}
      </fieldset>
      <div className="project-toolbar"><button type="submit" disabled={pending || archived || !projectsAvailable}>{pending ? 'Please wait…' : 'Submit report'}</button><button type="button" disabled={pending || archived || !projectsAvailable} onClick={() => validate(true)}>Save draft</button><button type="button" disabled={pending} onClick={() => onCancel(input.projectId)}>{archived ? 'Discard report' : 'Cancel'}</button></div>
    </form>
  </>
}
