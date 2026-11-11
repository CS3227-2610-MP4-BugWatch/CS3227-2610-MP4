// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core'
import type { ReactElement } from 'react'
import { createElement, StrictMode } from 'react'
import { act, cleanup, fireEvent, render as testingRender, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { ProjectsApp } from '../features/projects/ProjectsApp'
import { ReportForm } from '../features/reports/ReportForm'
import * as suggestionClient from '../features/reports/reportSuggestionClient'
import type { ReportSuggestionResult } from '../features/reports/reportSuggestionTypes'
import type { ReportDraft } from '../features/reports/types'

Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: (query: string) => ({
  matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
  addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
}) })

function render(element: ReactElement) {
  return testingRender(createElement(MantineProvider, { env: 'test' }, element))
}

const projectId = '20000000-0000-4000-8000-000000000001'
const project = {
  id: projectId, name: 'Test project', description: 'Test', repositoryUrl: 'https://example.test',
  createdBy: '10000000-0000-4000-8000-000000000001', createdAt: '2026-11-07T00:00:00Z',
  updatedAt: '2026-11-07T00:00:00Z', revision: 1, archivedAt: null,
}
const result: ReportSuggestionResult = {
  suggestions: { title: 'Suggested title', description: 'Suggested description' },
  questions: [{ field: 'version', text: 'Which version?' }], partial: true,
}

function setup(initialProjectId = projectId) {
  const generateSuggestions = vi.fn().mockResolvedValue(result)
  const onSaveDraft = vi.fn()
  const router = createMemoryRouter([{
    path: '/', element: createElement(ReportForm, {
      projects: [project], projectsAvailable: true, initialProjectId, pending: false,
      error: '', fieldErrors: {}, archivedProjectId: '', savedInput: null, isDraft: false,
      confirmation: '', allowNavigation: { current: false }, onSaveDraft, onSubmit: vi.fn(),
      onCancel: vi.fn(), generateSuggestions,
    }),
  }])
  const rendered = render(createElement(RouterProvider, { router }))
  return { generateSuggestions, onSaveDraft, unmount: rendered.unmount }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement
const enter = (label: string, value: string) => fireEvent.change(field(label), { target: { value } })
const generateButton = () => screen.getByRole('button', { name: 'Generate suggestions' }) as HTMLButtonElement
const suggestedTitle = () => screen.findByLabelText('AI generated suggestion for Title')

function fill() {
  enter('Title', 'Original title')
  enter('Description', 'Original description')
}

it('reportSuggestions_missingPrerequisites_disablesUntilProjectTitleAndDescriptionExist', () => {
  const { generateSuggestions } = setup('')
  expect(generateButton().disabled).toBe(true)
  enter('Title', 'A title')
  enter('Description', ' ')
  enter('Project', projectId)
  expect(generateButton().disabled).toBe(true)
  enter('Description', 'A description')
  expect(generateButton().disabled).toBe(false)
  expect(generateSuggestions).not.toHaveBeenCalled()
})

it('reportSuggestions_partialResult_displaysOnlyAvailableEntriesAndKeepsOriginalDraft', async () => {
  const { generateSuggestions, onSaveDraft } = setup()
  fill()
  enter('Severity', 'high')
  fireEvent.click(generateButton())
  await suggestedTitle()
  expect(generateSuggestions).toHaveBeenCalledExactlyOnceWith(
    { projectId, title: 'Original title', description: 'Original description' },
    expect.any(AbortSignal),
  )
  expect(screen.queryByLabelText('AI generated suggestion for Reproduction steps')).toBeNull()
  expect(screen.getByText('Which version?', { exact: false })).toBeTruthy()
  expect(field('Title').value).toBe('Original title')
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  expect(onSaveDraft).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ title: 'Original title', description: 'Original description' }))
})

it('reportSuggestions_useEditedSuggestion_changesOnlySelectedField', async () => {
  setup()
  fill()
  fireEvent.click(generateButton())
  const suggestion = await suggestedTitle()
  fireEvent.change(suggestion, { target: { value: 'Edited suggestion' } })
  const [applyTitle] = screen.getAllByRole('button', { name: 'Use suggestion' })
  fireEvent.click(applyTitle)
  expect(field('Title').value).toBe('Edited suggestion')
  expect(field('Description').value).toBe('Original description')
  expect((screen.getByLabelText('AI generated suggestion for Description') as HTMLTextAreaElement).value).toBe('Suggested description')
})

it('reportSuggestions_pendingRequest_allowsDraftSaveAndLabelsResultAfterEdits', async () => {
  const { generateSuggestions, onSaveDraft } = setup()
  let finish!: (value: ReportSuggestionResult) => void
  generateSuggestions.mockReturnValue(new Promise<ReportSuggestionResult>(resolve => { finish = resolve }))
  fill()
  fireEvent.click(generateButton())
  expect((screen.getByRole('button', { name: 'Generating…' }) as HTMLButtonElement).disabled).toBe(true)
  enter('Description', 'Edited during generation')
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  expect(onSaveDraft).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ description: 'Edited during generation' }))
  await act(async () => { finish(result) })
  expect(screen.getByText(/generated before your latest edits/i)).toBeTruthy()
  expect(field('Description').value).toBe('Edited during generation')
})

it('reportSuggestions_editedSuggestion_regenerationRequiresConfirmationAndFailurePreservesIt', async () => {
  const { generateSuggestions } = setup()
  fill()
  fireEvent.click(generateButton())
  fireEvent.change(await suggestedTitle(), { target: { value: 'Edited suggestion' } })
  fireEvent.click(generateButton())
  expect(screen.getByRole('dialog', { name: 'Replace edited suggestions?' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Keep suggestions' }))
  expect(generateSuggestions).toHaveBeenCalledTimes(1)
  generateSuggestions.mockRejectedValueOnce(new Error('temporary failure'))
  fireEvent.click(generateButton())
  fireEvent.click(screen.getByRole('button', { name: 'Replace and generate' }))
  await screen.findByRole('alert')
  expect((await suggestedTitle() as HTMLTextAreaElement).value).toBe('Edited suggestion')
  expect(field('Title').value).toBe('Original title')
  expect(generateButton().disabled).toBe(false)
})

it('reportSuggestions_rateLimited_disablesGenerationUntilRetryTimeWithoutBlockingDraftSave', async () => {
  const { generateSuggestions, onSaveDraft } = setup()
  fill()
  generateSuggestions.mockRejectedValueOnce(new suggestionClient.ReportSuggestionRateLimit(1500))
  vi.useFakeTimers()
  try {
    await act(async () => { fireEvent.click(generateButton()) })
    expect(screen.getByRole('alert').textContent).toContain('2 seconds')
    expect(generateButton().disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(onSaveDraft).toHaveBeenCalledTimes(1)
    act(() => { vi.advanceTimersByTime(1499) })
    expect(generateButton().disabled).toBe(true)
    act(() => { vi.advanceTimersByTime(1) })
    expect(generateButton().disabled).toBe(false)
  } finally {
    vi.useRealTimers()
  }
})

it('reportSuggestions_formUnmount_abortsPendingGeneration', async () => {
  const { generateSuggestions, unmount } = setup()
  generateSuggestions.mockReturnValue(new Promise(() => {}))
  fill()
  fireEvent.click(generateButton())
  const signal = generateSuggestions.mock.calls[0][1] as AbortSignal
  expect(signal.aborted).toBe(false)
  unmount()
  await waitFor(() => expect(signal.aborted).toBe(true))
})

it('reportSuggestions_firstDraftSave_keepsPendingSuggestionsUntilLeavingTheDraft', async () => {
  const id = '30000000-0000-4000-8000-000000000001'
  const draft: ReportDraft = {
    id, projectId, projectName: project.name, projectArchivedAt: null,
    title: 'Original title', description: 'Original description', version: '', reproductionSteps: '',
    expectedResults: '', actualResults: '', severity: '', testEnvironment: '', updatedAt: project.updatedAt,
  }
  const repository = {
    listActiveProjects: vi.fn().mockResolvedValue([project]), getProject: vi.fn(),
    listProjectHistory: vi.fn(), createProject: vi.fn(), updateProject: vi.fn(),
  }
  const reportRepository = {
    saveDraft: vi.fn().mockResolvedValue(draft), getDraft: vi.fn().mockResolvedValue(draft),
    listDrafts: vi.fn().mockResolvedValue([draft]), deleteDraft: vi.fn(), submitDraft: vi.fn(),
    listProjectReports: vi.fn(), createReport: vi.fn(), getReport: vi.fn(), listReportHistory: vi.fn(),
    acceptReport: vi.fn(), startInvestigation: vi.fn(),
    awaitTesterInformation: vi.fn(), resumeInvestigation: vi.fn(),
    listReportComments: vi.fn().mockResolvedValue([]), postReportComment: vi.fn(),
  }
  let finish!: (value: ReportSuggestionResult) => void
  const generate = vi.spyOn(suggestionClient, 'requestReportSuggestions').mockReturnValue(
    new Promise(resolve => { finish = resolve }),
  )
  const router = createMemoryRouter([{
    path: '*', element: createElement(ProjectsApp, {
      repository, reportRepository, user: { id: project.createdBy, role: 'tester', username: 'tester', displayName: 'Tester' },
    }),
  }], { initialEntries: [`/reports/new?projectId=${projectId}`] })
  render(createElement(StrictMode, null, createElement(RouterProvider, { router })))
  await screen.findByLabelText('Title')
  fill()
  fireEvent.click(generateButton())
  const signal = generate.mock.calls[0][1]
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await screen.findByRole('heading', { name: 'Edit draft' })
  expect(signal.aborted).toBe(false)
  expect(screen.getByRole('button', { name: 'Generating…' })).toBeTruthy()
  await act(async () => { finish(result) })
  expect(await suggestedTitle()).toBeTruthy()
  expect(field('Title').value).toBe(draft.title)
  fireEvent.click(screen.getByRole('link', { name: 'My drafts' }))
  fireEvent.click(await screen.findByRole('link', { name: draft.title }))
  await screen.findByLabelText('Title')
  expect(screen.queryByLabelText('AI generated suggestion for Title')).toBeNull()
  expect(generate).toHaveBeenCalledTimes(1)
})
