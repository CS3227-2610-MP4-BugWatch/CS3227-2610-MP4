import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useBlocker } from 'react-router'
import type { Project } from '../projects/types'
import { requestReportSuggestions } from './reportSuggestionClient'
import type { GenerateReportSuggestions } from './reportSuggestionClient'
import type { SuggestedField } from './reportSuggestionTypes'
import type { ReportFieldErrors, ReportInput, ReportSeverityConflict } from './types'
import { suggestionPrerequisites, suggestionRequest, useReportSuggestions } from './useReportSuggestions'
import type { ReportSuggestionSession } from './useReportSuggestions'
import { REPORT_SEVERITIES, REPORT_TEXT_FIELDS, REPORT_TEXT_KEYS, validateDraftInput, validateReportInput } from './validation'

type Props = {
  projects: Project[]; initialProjectId: string; initialInput?: ReportInput; projectsAvailable: boolean
  pending: boolean; error: string; fieldErrors: ReportFieldErrors; archivedProjectId: string; archivedProjectName?: string
  savedInput: ReportInput | null; isDraft: boolean; confirmation: string; allowNavigation: React.RefObject<boolean>
  onSubmit: (input: ReportInput) => void; onSaveDraft: (input: ReportInput) => void; onCancel: (projectId: string) => void
  generateSuggestions?: GenerateReportSuggestions
  suggestionSession?: ReportSuggestionSession
  mode?: 'create' | 'edit'
  severityConflict?: ReportSeverityConflict
}

export function ReportForm({ projects, initialProjectId, initialInput, projectsAvailable, pending, error, fieldErrors, archivedProjectId, archivedProjectName, savedInput, isDraft, confirmation, allowNavigation, onSubmit, onSaveDraft, onCancel, generateSuggestions = requestReportSuggestions, suggestionSession, mode = 'create', severityConflict }: Props) {
  useEffect(() => { if (severityConflict) document.getElementById('severity-conflict')?.focus() }, [severityConflict])
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
  const assistant = useReportSuggestions(generateSuggestions, suggestionSession)
  const request = suggestionRequest(input)
  const prerequisites = suggestionPrerequisites(request, projectsAvailable && !archived
    && projects.some(project => project.id === input.projectId && project.archivedAt === null))
  const generationDisabled = pending || assistant.generating || assistant.retryAfterMs > 0 || prerequisites.length > 0
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
  function suggestion(field: SuggestedField) {
    const value = assistant.suggestions?.edited[field]
    if (value === undefined) return null
    const { label, limit } = REPORT_TEXT_FIELDS[field]
    const usable = !!value.trim() && Array.from(value.trim()).length <= limit
    return <div>
      <label htmlFor={`${field}-suggestion`}>AI generated suggestion</label>
      <textarea id={`${field}-suggestion`} rows={3} value={value}
        aria-label={`AI generated suggestion for ${label}`}
        disabled={pending || assistant.generating} onChange={event => assistant.edit(field, event.target.value)} />
      {!usable && <p>Enter a suggestion between 1 and {limit} characters.</p>}
      <button type="button" disabled={pending || assistant.generating || !usable} onClick={() => {
        change(field, value.trim())
        assistant.remove(field)
      }}>Use suggestion</button>
    </div>
  }
  return <>
    {blocker.state === 'blocked' && <div role="dialog" aria-modal="true" aria-label="Unsaved changes"><p>You have unsaved changes.</p><button type="button" onClick={() => blocker.reset()}>Keep editing</button><button type="button" onClick={() => blocker.proceed()}>Leave without saving</button></div>}
    {severityConflict && <div id="severity-conflict" role="alert" tabIndex={-1}><p>{severityConflict.actorRole === 'developer' ? 'A Developer changed the severity' : 'Severity changed'} since you opened this report. Current severity: {REPORT_SEVERITIES[severityConflict.latestSeverity]}. Your selected severity: {input.severity ? REPORT_SEVERITIES[input.severity] : 'Not selected'}.</p><p>Your changes have not been saved. Review the severity, then choose Save changes again to use your selected value.</p></div>}
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
        return field(key, REPORT_TEXT_FIELDS[key].label, <>
          {key === 'title' || key === 'version' ? <input type="text" {...props} /> : <textarea rows={3} {...props} />}
          {(key === 'title' || key === 'description' || key === 'reproductionSteps') && suggestion(key)}
        </>)
      })}</fieldset>)}
      <fieldset className={`form-section${severityConflict ? ' severity-conflict' : ''}`}><legend>Impact</legend>
      {severityConflict && <p>Current severity: {REPORT_SEVERITIES[severityConflict.latestSeverity]}. Your selected severity: {input.severity ? REPORT_SEVERITIES[input.severity] : 'Not selected'}.</p>}
      {field('severity', 'Severity', <select {...accessibility('severity')} required value={input.severity} onChange={event => change('severity', event.target.value as ReportInput['severity'])}><option value="">Choose a severity</option>{Object.entries(REPORT_SEVERITIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>)}
      </fieldset>
      {assistant.suggestions && (assistant.suggestions.source.projectId !== input.projectId
        || assistant.suggestions.source.severity !== input.severity
        || REPORT_TEXT_KEYS.some(field => (assistant.suggestions?.source[field]?.trim() ?? '') !== (input[field]?.trim() ?? '')))
        && <p role="status">Generated before your latest edits.</p>}
      {!!assistant.suggestions?.result.questions.length && <section aria-label="Details to add">
        <h3>Details to add</h3>
        <ol>{assistant.suggestions.result.questions.map(({ field, text }, index) => <li key={index}>
          {field && <strong>{REPORT_TEXT_FIELDS[field].label}: </strong>}{text}
        </li>)}</ol>
      </section>}
      {assistant.suggestions?.result.partial && <p role="status">Some suggestions are missing. Generate suggestions again to try for more.</p>}
      {assistant.error && <p role="alert">{assistant.error}</p>}
      {!!prerequisites.length && <p id="suggestion-prerequisites">{prerequisites.join(' ')}</p>}
      {assistant.confirmReplacement ? <div role="dialog" aria-label="Replace edited suggestions?">
        <p>Replace edited suggestions?</p>
        <button type="button" onClick={assistant.cancelReplacement}>Keep suggestions</button>
        <button type="button" disabled={generationDisabled} onClick={() => { void assistant.start(request, input) }}>Replace and generate</button>
      </div> : <button type="button" disabled={generationDisabled}
        aria-describedby={prerequisites.length ? 'suggestion-prerequisites' : undefined}
        onClick={() => assistant.requestGeneration(request, input)}>
        {assistant.generating ? 'Generating…' : 'Generate suggestions'}
      </button>}
      <div className="project-toolbar"><button type="submit" disabled={pending || archived || !projectsAvailable}>{pending ? 'Please wait…' : mode === 'edit' ? 'Save changes' : 'Submit report'}</button>{mode !== 'edit' && <button type="button" disabled={pending || archived || !projectsAvailable} onClick={() => validate(true)}>Save draft</button>}<button type="button" disabled={pending} onClick={() => onCancel(input.projectId)}>{mode !== 'edit' && archived ? 'Discard report' : 'Cancel'}</button></div>
    </form>
  </>
}
