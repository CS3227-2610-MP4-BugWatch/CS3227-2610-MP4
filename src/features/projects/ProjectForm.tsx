import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { ProjectInput } from './types'
import { validateProjectInput } from './validation'

interface ProjectFormProps {
  initialValue: ProjectInput
  pending: boolean
  error: string
  fieldErrors?: Partial<Record<keyof ProjectInput, string>>
  blocked?: boolean
  onSubmit: (value: ProjectInput) => void
  onCancel: () => void
}

export function ProjectForm({ initialValue, pending, error, fieldErrors, blocked = false, onSubmit, onCancel }: ProjectFormProps) {
  const [input, setInput] = useState<ProjectInput>(() => ({
    name: initialValue.name, description: initialValue.description, repositoryUrl: initialValue.repositoryUrl,
  }))
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ProjectInput, string>>>({})
  const errors = { ...fieldErrors, ...validationErrors }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || blocked) return
    const result = validateProjectInput(input)
    if (!result.valid) {
      setValidationErrors(result.errors)
      return
    }
    setValidationErrors({})
    onSubmit(result.value)
  }

  function field(name: keyof ProjectInput, label: string, multiline = false) {
    const props = {
      id: name, name, value: input[name], disabled: pending,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setInput(current => ({ ...current, [name]: event.target.value }))
        setValidationErrors(current => ({ ...current, [name]: undefined }))
      },
      'aria-invalid': Boolean(errors[name]),
      'aria-describedby': `${name}-hint${errors[name] ? ` ${name}-error` : ''}`,
    }
    const hint = name === 'name' ? '1–100 characters. Names are unique ignoring case and surrounding whitespace.'
      : name === 'description' ? '1–5,000 characters of plain text.'
        : 'Absolute HTTP or HTTPS URL, up to 2,048 characters. The repository is not verified.'
    return <div className="project-field">
      <label htmlFor={name}>{label} (required)</label>
      {multiline ? <textarea {...props} rows={5} /> : <input {...props} type="text" />}
      <small id={`${name}-hint`}>{hint}</small>
      {errors[name] && <span id={`${name}-error`} className="field-error">{errors[name]}</span>}
    </div>
  }

  return <form className="project-form" onSubmit={submit} noValidate>
    {error && <p role="alert" className="project-message">{error}</p>}
    <fieldset className="form-section"><legend>Project information</legend>
    {field('name', 'Name')}
    {field('description', 'Description', true)}
    {field('repositoryUrl', 'Repository URL')}
    </fieldset>
    <div className="project-actions">
      <button type="submit" disabled={pending || blocked}>{pending ? 'Saving…' : 'Save project'}</button>
      <button type="button" disabled={pending} onClick={onCancel}>Cancel</button>
    </div>
  </form>
}
