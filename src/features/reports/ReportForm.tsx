import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { Project } from '../projects/types'
import type { ReportFieldErrors, ReportInput } from './types'
import { REPORT_SEVERITIES, REPORT_TEXT_FIELDS, REPORT_TEXT_KEYS, validateReportInput } from './validation'

type Props = {
  projects: Project[]
  initialProjectId: string
  pending: boolean
  error: string
  fieldErrors: ReportFieldErrors
  archivedProjectId: string
  onSubmit: (input: ReportInput) => void
  onCancel: (projectId: string) => void
}

export function ReportForm({ projects, initialProjectId, pending, error, fieldErrors, archivedProjectId, onSubmit, onCancel }: Props) {
  const [input, setInput] = useState<ReportInput>({
    projectId: initialProjectId, title: '', description: '', version: '', reproductionSteps: '',
    expectedResults: '', actualResults: '', severity: '', testEnvironment: '',
  })
  const [errors, setErrors] = useState<ReportFieldErrors>({})
  const [edited, setEdited] = useState<Partial<Record<keyof ReportInput, boolean>>>({})
  const [lastFieldErrors, setLastFieldErrors] = useState(fieldErrors)
  const archived = archivedProjectId !== '' && input.projectId === archivedProjectId
  if (lastFieldErrors !== fieldErrors) {
    setLastFieldErrors(fieldErrors)
    setEdited({})
  }

  function change<K extends keyof ReportInput>(key: K, value: ReportInput[K]) {
    setInput(previous => ({ ...previous, [key]: value }))
    setErrors(previous => ({ ...previous, [key]: undefined }))
    setEdited(previous => ({ ...previous, [key]: true }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (pending || archived) return
    const result = validateReportInput(input)
    if (!result.valid) { setErrors(result.errors); return }
    if (!projects.some(project => project.id === result.value.projectId)) {
      setErrors({ projectId: 'Choose an active project.' })
      return
    }
    setErrors({})
    onSubmit(result.value)
  }

  function message(key: keyof ReportInput) {
    return errors[key] ?? (edited[key] ? undefined : fieldErrors[key])
  }

  function field(key: keyof ReportInput, label: string, control: ReactNode) {
    const feedback = message(key)
    return <div className="project-field" key={key}>
      <label htmlFor={key}>{label}</label>
      {control}
      {feedback && <p id={`${key}-error`}>{feedback}</p>}
    </div>
  }

  function accessibility(key: keyof ReportInput) {
    return { id: key, disabled: pending, 'aria-invalid': !!message(key),
      'aria-describedby': message(key) ? `${key}-error` : undefined }
  }

  return <form onSubmit={submit} noValidate>
    <p>All fields are required except Test environment.</p>
    {archived ? <div role="alert">
      <p>This project has been archived. Your report wasn’t submitted.</p>
      <p>If the bug still needs attention, contact the Developer who created this project outside BugWatch.</p>
    </div> : error && <p role="alert">{error}</p>}
    {field('projectId', 'Project', <select {...accessibility('projectId')} required value={input.projectId}
      onChange={event => change('projectId', event.target.value)}>
      <option value="">Choose a project</option>
      {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
    </select>)}
    {REPORT_TEXT_KEYS.map(key => {
      const props = {
        ...accessibility(key), required: key !== 'testEnvironment', value: input[key] ?? '',
        onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(key, event.target.value),
      }
      return field(key, REPORT_TEXT_FIELDS[key].label,
        key === 'title' || key === 'version' ? <input type="text" {...props} /> : <textarea rows={3} {...props} />)
    })}
    {field('severity', 'Severity', <select {...accessibility('severity')} required value={input.severity}
      onChange={event => change('severity', event.target.value as ReportInput['severity'])}>
      <option value="">Choose a severity</option>
      {Object.entries(REPORT_SEVERITIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>)}
    <div className="project-toolbar">
      <button type="submit" disabled={pending || archived}>{pending ? 'Submitting…' : 'Submit report'}</button>
      <button type="button" disabled={pending} onClick={() => onCancel(input.projectId)}>
        {archived ? 'Discard report' : 'Cancel'}
      </button>
    </div>
  </form>
}
