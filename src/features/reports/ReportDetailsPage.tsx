import { Badge, Button, Group, NativeSelect, Tabs, Textarea, TextInput } from '@mantine/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import type { SessionUser } from '../projects/types'
import { ReportError } from './types'
import type { ProjectReportSummary, Report, ReportComment, ReportHistoryEntry, ReportInput, ReportRepository, ReportResolution, ReportSeverity, ResolutionFieldErrors, ResolutionInput } from './types'
import { COMMENT_TEXT_LIMIT, REPORT_SEVERITIES, REPORT_TEXT_FIELDS, REPORT_TEXT_KEYS, RESOLUTION_TEXT_LIMIT, RESOLUTION_VERSION_LIMIT, RESOLUTION_URL_LIMIT, validateCommentInput, validateResolutionInput } from './validation'
import { requestTesterQuestions } from './testerQuestionClient'
import type { GenerateTesterQuestions } from './testerQuestionClient'
import { questionContextVersion, TESTER_QUESTION_ELIGIBLE_STATES } from './testerQuestionTypes'
import { useTesterQuestions } from './useTesterQuestions'

type ReportRead = { status: 'loading' | 'missing' | 'error' } | { status: 'ready'; report: Report }
type SectionRead<T> = { status: 'loading' | 'error' } | { status: 'ready'; values: T[] }
type DetailProps = { reportRepository: ReportRepository; user: SessionUser; generateTesterQuestions?: GenerateTesterQuestions }
type WorkflowAction = 'accept' | 'start' | 'await' | 'resume'

function dateLabel(value: string) {
  return new Date(value).toLocaleString()
}

function identityLabel(displayName?: string | null, username?: string | null) {
  return displayName?.trim() || username?.trim() || 'Unavailable user'
}

function historyLabel(field: keyof ReportInput) {
  if (field === 'projectId') return 'Project'
  if (field === 'severity') return 'Severity'
  return REPORT_TEXT_FIELDS[field].label
}

const actionLabels: Record<WorkflowAction, string> = {
  accept: 'Accept report', start: 'Start investigation', await: 'Await tester information', resume: 'Resume investigation',
}

const actionSuccess: Record<WorkflowAction, string> = {
  accept: 'Report accepted.', start: 'Investigation started.', await: 'Report is awaiting tester information.', resume: 'Investigation resumed.',
}

const resolutionLabels: Record<ResolutionInput['kind'], string> = {
  fixed: 'Fixed', duplicate: 'Duplicate', invalid: 'Invalid', cannot_reproduce: 'Cannot reproduce', will_not_fix: 'Will not fix',
}

export function ReportDetailsPage(props: DetailProps) {
  const { reportId } = useParams()
  return <ReportDetails key={`${reportId}:${props.user.id}:${props.user.role}`} {...props} reportId={reportId} />
}

function ReportDetails({ reportRepository, user, reportId, generateTesterQuestions = requestTesterQuestions }: DetailProps & { reportId?: string }) {
  const [state, setState] = useState<ReportRead>({ status: 'loading' })
  const [history, setHistory] = useState<SectionRead<ReportHistoryEntry>>({ status: 'loading' })
  const [comments, setComments] = useState<SectionRead<ReportComment>>({ status: 'loading' })
  const [tab, setTab] = useState<string | null>('conversation')
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<ReportComment | null>(null)
  const [pending, setPending] = useState<'workflow' | 'comment' | 'resolution' | 'link' | null>(null)
  const [feedback, setFeedback] = useState('')
  const [commentFeedback, setCommentFeedback] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const [commentUncertain, setCommentUncertain] = useState(false)
  const [focusTarget, setFocusTarget] = useState<{ id: string } | null>(null)
  const [copyFeedback, setCopyFeedback] = useState('')
  const [resolutionOpen, setResolutionOpen] = useState(false)
  const [resolutionKind, setResolutionKind] = useState<ResolutionInput['kind']>('fixed')
  const [resolutionFields, setResolutionFields] = useState({ fixSummary: '', affectedVersion: '', commitUrl: '', pullRequestUrl: '', explanation: '' })
  const [resolutionErrors, setResolutionErrors] = useState<ResolutionFieldErrors>({})
  const [canonicalId, setCanonicalId] = useState('')
  const [canonicalError, setCanonicalError] = useState('')
  const [targets, setTargets] = useState<SectionRead<ProjectReportSummary>>({ status: 'loading' })
  const [targetAttempt, setTargetAttempt] = useState(0)
  const request = useRef({ generation: 0, pending: false, reportRead: 0, historyRead: 0, commentsRead: 0, targetsRead: 0 })
  const composer = useRef<HTMLTextAreaElement>(null)

  const loadHistory = useCallback(async () => {
    const scope = request.current
    const generation = scope.generation
    const read = ++scope.historyRead
    setHistory({ status: 'loading' })
    try {
      const values = reportId ? await reportRepository.listReportHistory(reportId) : []
      if (scope.generation !== generation || scope.historyRead !== read) return false
      setHistory({ status: 'ready', values })
      return true
    } catch {
      if (scope.generation === generation && scope.historyRead === read) setHistory({ status: 'error' })
      return false
    }
  }, [reportId, reportRepository])

  const loadComments = useCallback(async () => {
    const scope = request.current
    const generation = scope.generation
    const read = ++scope.commentsRead
    setComments({ status: 'loading' })
    try {
      const values = reportId ? await reportRepository.listReportComments(reportId) : []
      if (scope.generation !== generation || scope.commentsRead !== read) return false
      setComments({ status: 'ready', values })
      setCommentUncertain(false)
      return true
    } catch {
      if (scope.generation === generation && scope.commentsRead === read) setComments({ status: 'error' })
      return false
    }
  }, [reportId, reportRepository])

  const loadReport = useCallback(async (includeComments: boolean) => {
    const scope = request.current
    const generation = scope.generation
    const read = ++scope.reportRead
    try {
      const report = reportId ? await reportRepository.getReport(reportId) : null
      if (scope.generation !== generation || scope.reportRead !== read) return
      if (!report) { setState({ status: 'missing' }); return }
      setState({ status: 'ready', report })
      const historyResult = loadHistory()
      if (includeComments) void loadComments()
      const historyReady = await historyResult
      if (scope.generation === generation && scope.reportRead === read) {
        if (historyReady) setUncertain(false)
        else if (scope.pending) setFeedback('The action may have been saved, but its activity history could not be confirmed. Reload before trying another action.')
      }
    } catch {
      if (scope.generation === generation && scope.reportRead === read) {
        setState({ status: 'error' })
        setUncertain(true)
      }
    }
  }, [reportId, reportRepository, loadHistory, loadComments])

  useEffect(() => {
    const scope = request.current
    const generation = ++scope.generation
    async function load() {
      try {
        const report = reportId ? await reportRepository.getReport(reportId) : null
        if (scope.generation !== generation) return
        if (!report) { setState({ status: 'missing' }); return }
        setState({ status: 'ready', report })
        setCanonicalId(report.canonicalReport?.id ?? '')
        void loadHistory()
        void loadComments()
      } catch {
        if (scope.generation === generation) setState({ status: 'error' })
      }
    }
    void load()
    return () => { scope.generation++ }
  }, [reportId, reportRepository, loadHistory, loadComments])

  const targetProjectId = state.status === 'ready' && user.role === 'developer' && !state.report.projectArchivedAt
    && state.report.assignedDeveloperId?.toLowerCase() === user.id.toLowerCase() ? state.report.projectId : null
  useEffect(() => {
    if (!targetProjectId) return
    const scope = request.current
    const generation = scope.generation
    const read = ++scope.targetsRead
    reportRepository.listProjectReports(targetProjectId).then(values => {
      if (scope.generation !== generation || scope.targetsRead !== read) return
      setTargets({ status: 'ready', values: values.filter(value => value.id.toLowerCase() !== reportId?.toLowerCase()) })
    }).catch(() => {
      if (scope.generation === generation && scope.targetsRead === read) setTargets({ status: 'error' })
    })
    return () => { scope.targetsRead++ }
  }, [targetProjectId, reportRepository, reportId, targetAttempt])

  useEffect(() => {
    if (tab !== 'conversation' || !focusTarget) return
    const target = document.getElementById(focusTarget.id)
    if (target) {
      target.focus()
      target.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
    }
  }, [tab, focusTarget])

  function jumpTo(target: string) {
    setTab('conversation')
    setFocusTarget({ id: target })
  }

  async function act(action: WorkflowAction) {
    if (request.current.pending || state.status !== 'ready' || uncertain || commentUncertain) return
    request.current.pending = true
    const generation = request.current.generation
    setPending('workflow')
    setFeedback('')
    try {
      const methods = {
        accept: () => reportRepository.acceptReport(state.report.id),
        start: () => reportRepository.startInvestigation(state.report.id),
        await: () => reportRepository.awaitTesterInformation(state.report.id),
        resume: () => reportRepository.resumeInvestigation(state.report.id),
      }
      await methods[action]()
      if (request.current.generation !== generation) return
      setFeedback(`${actionSuccess[action]} Reloading the saved report.`)
      setUncertain(true)
      await loadReport(false)
    } catch (error) {
      if (request.current.generation !== generation) return
      setUncertain(true)
      if (error instanceof ReportError && ['already_assigned', 'state_conflict', 'archived'].includes(error.code)) {
        setFeedback(error.message)
        await loadReport(false)
      } else if (error instanceof ReportError && ['forbidden', 'not_found', 'validation', 'unauthenticated'].includes(error.code)) {
        setFeedback(error.message)
      } else {
        setFeedback('The action could not be confirmed. It may have been saved. Reload the report before trying another action.')
      }
    } finally {
      if (request.current.generation === generation) {
        request.current.pending = false
        setPending(null)
      }
    }
  }

  async function postComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (request.current.pending || state.status !== 'ready' || uncertain || commentUncertain || comments.status !== 'ready') return
    const input = validateCommentInput({ body, replyToCommentId: replyTo?.id ?? null })
    if (!input.valid) { setCommentFeedback(input.message); return }
    request.current.pending = true
    const generation = request.current.generation
    setPending('comment')
    setCommentFeedback('')
    try {
      await reportRepository.postReportComment(state.report.id, input.value)
      if (request.current.generation !== generation) return
      const readback = await loadComments()
      if (request.current.generation !== generation) return
      if (readback) {
        setBody('')
        setReplyTo(null)
        setCommentFeedback('Comment posted.')
      } else {
        setCommentUncertain(true)
        setCommentFeedback('Your comment may have been saved, but discussion could not be refreshed. Reload and check the conversation before posting again.')
      }
    } catch (error) {
      if (request.current.generation !== generation) return
      if (error instanceof ReportError && ['validation', 'forbidden', 'not_found', 'unauthenticated', 'archived'].includes(error.code)) {
        setCommentFeedback(error.message)
        if (error.code === 'archived') await loadReport(false)
      } else {
        setCommentUncertain(true)
        setCommentFeedback('Your comment could not be confirmed. It may have been saved. Reload and check the conversation before posting again.')
      }
    } finally {
      if (request.current.generation === generation) {
        request.current.pending = false
        setPending(null)
      }
    }
  }

  async function saveResolutionOrLink(action: 'resolution' | 'link', operation: () => Promise<Report>) {
    if (request.current.pending || state.status !== 'ready' || uncertain || commentUncertain) return
    request.current.pending = true
    const generation = request.current.generation
    setPending(action)
    setFeedback('')
    try {
      await operation()
      if (request.current.generation !== generation) return
      setFeedback(action === 'resolution' ? 'Report resolved. Reloading the saved report.' : 'Canonical link saved. Reloading the saved report.')
      setUncertain(true)
      await loadReport(false)
    } catch (error) {
      if (request.current.generation !== generation) return
      if (error instanceof ReportError && error.code === 'validation') {
        setFeedback(error.message)
        if (action === 'resolution') setResolutionErrors(error.fieldErrors ?? {})
        else setCanonicalError(error.message)
      } else if (error instanceof ReportError && ['state_conflict', 'archived', 'already_assigned'].includes(error.code)) {
        setFeedback(error.message)
        setUncertain(true)
        await loadReport(false)
      } else if (error instanceof ReportError && ['forbidden', 'not_found', 'unauthenticated'].includes(error.code)) {
        setFeedback(error.message)
        setUncertain(true)
      } else {
        setFeedback('The action could not be confirmed. It may have been saved. Reload the report before trying another action.')
        setUncertain(true)
      }
    } finally {
      if (request.current.generation === generation) {
        request.current.pending = false
        setPending(null)
      }
    }
  }

  function resolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state.status !== 'ready') return
    const input: ResolutionInput = resolutionKind === 'fixed'
      ? { kind: 'fixed', fixSummary: resolutionFields.fixSummary, affectedVersion: resolutionFields.affectedVersion,
        commitUrl: resolutionFields.commitUrl, pullRequestUrl: resolutionFields.pullRequestUrl }
      : resolutionKind === 'duplicate' ? { kind: 'duplicate', explanation: resolutionFields.explanation, canonicalReportId: state.report.canonicalReport?.id ?? '' }
        : { kind: resolutionKind, explanation: resolutionFields.explanation }
    const result = validateResolutionInput(input)
    if (!result.valid) { setResolutionErrors(result.errors); return }
    setResolutionErrors({})
    void saveResolutionOrLink('resolution', () => reportRepository.resolveReport(state.report.id, result.value))
  }

  function saveCanonicalLink() {
    if (state.status !== 'ready') return
    if (!canonicalId) { setCanonicalError('Choose a canonical report.'); return }
    setCanonicalError('')
    void saveResolutionOrLink('link', () => reportRepository.linkDuplicate(state.report.id, canonicalId, state.report.canonicalReport?.id ?? null))
  }

  const report = state.status === 'ready' ? state.report : null
  const eligible = report && user.role === 'developer' && !report.projectArchivedAt
  const assigned = report?.assignedDeveloperId?.toLowerCase() === user.id.toLowerCase()
  const workflowAction: WorkflowAction | null = !eligible ? null
    : report.state === 'Open' && report.assignedDeveloperId === null ? 'accept'
      : assigned && report.state === 'Accepted' ? 'start'
        : assigned && report.state === 'In progress' ? 'await'
          : assigned && report.state === 'Awaiting tester information' ? 'resume' : null
  const mutationBlocked = Boolean(pending) || uncertain || commentUncertain
  const commentCount = comments.status === 'ready' ? comments.values.length : null
  const latestComment = comments.status === 'ready' ? comments.values.at(-1) : undefined
  const questionsEligible = Boolean(eligible && assigned && report
    && TESTER_QUESTION_ELIGIBLE_STATES.includes(report.state))
  const contextVersion = report && comments.status === 'ready'
    ? questionContextVersion({ report, discussion: comments.values }) : null
  const questions = useTesterQuestions(generateTesterQuestions, reportId, questionsEligible, contextVersion)

  async function copyQuestion(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback('Question copied. Paste and edit it in the comment composer when ready.')
    } catch {
      setCopyFeedback('Could not copy the question. Select its text and copy it manually.')
    }
  }

  return <section className="project-panel report-detail-page">
    {state.status !== 'ready' && <Button component={Link} to="/projects" variant="default">Back to projects</Button>}
    {feedback && <p role="alert">{feedback}</p>}
    {state.status === 'loading' && <p role="status">Loading report…</p>}
    {state.status === 'missing' && <h2>Report not found</h2>}
    {state.status === 'error' && <>
      <p role="alert">The report could not be loaded. If an action was submitted, it may have been saved. Reload to check the current report.</p>
      <Button type="button" variant="default" onClick={() => void loadReport(true)}>{feedback ? 'Reload' : 'Retry'}</Button>
    </>}
    {report && <>
      <ReportHeader report={report} />
      <Group className="report-header-actions" gap="sm" role="group" aria-label="Report actions" aria-busy={Boolean(pending)}>
        {workflowAction && <Button type="button" disabled={mutationBlocked} onClick={() => void act(workflowAction)}>{actionLabels[workflowAction]}</Button>}
        {eligible && assigned && report.state === 'In progress' && !resolutionOpen && <Button type="button" disabled={mutationBlocked} onClick={() => {
          setResolutionOpen(true)
          setResolutionFields(fields => ({ ...fields, affectedVersion: report.version }))
        }}>Resolve report</Button>}
        <Button type="button" variant="subtle" onClick={() => jumpTo('report-discussion')}>Discussion{commentCount === null ? '' : ` (${commentCount})`}</Button>
        {(uncertain || commentUncertain) && !pending && <Button type="button" variant="default" onClick={() => void loadReport(true)}>Reload</Button>}
        {(pending === 'workflow' || pending === 'resolution' || pending === 'link') && <p role="status">Saving report action…</p>}
      </Group>
      {eligible && assigned && report.state === 'In progress' && resolutionOpen && <form className="report-resolution-form" aria-label="Resolve report" aria-describedby="report-resolution-unsaved-note" onSubmit={resolve} aria-busy={pending === 'resolution'} noValidate>
        <h3>Resolve report</h3>
        <p id="report-resolution-unsaved-note">Unsaved resolution text is lost when you leave this page or your session ends.</p>
        <NativeSelect label="Resolution outcome" value={resolutionKind} onChange={event => {
          setResolutionKind(event.currentTarget.value as ResolutionInput['kind'])
          setResolutionErrors({})
        }} data={Object.entries(resolutionLabels).map(([value, label]) => ({ value, label }))} error={resolutionErrors.kind} disabled={Boolean(pending)} />
        {resolutionKind === 'fixed' ? <>
          <Textarea label="Fix summary" required value={resolutionFields.fixSummary} onChange={event => { const value = event.currentTarget.value; setResolutionFields(fields => ({ ...fields, fixSummary: value })) }} error={resolutionErrors.fixSummary} description={`Up to ${RESOLUTION_TEXT_LIMIT.toLocaleString('en-US')} characters.`} rows={3} resize="vertical" disabled={Boolean(pending)} />
          <TextInput label="Affected version" required value={resolutionFields.affectedVersion} onChange={event => { const value = event.currentTarget.value; setResolutionFields(fields => ({ ...fields, affectedVersion: value })) }} error={resolutionErrors.affectedVersion} description={`Up to ${RESOLUTION_VERSION_LIMIT} characters. The submitted report version stays unchanged.`} disabled={Boolean(pending)} />
          <TextInput label="Commit URL" required value={resolutionFields.commitUrl} onChange={event => { const value = event.currentTarget.value; setResolutionFields(fields => ({ ...fields, commitUrl: value })) }} error={resolutionErrors.commitUrl} description={`An HTTP(S) URL, up to ${RESOLUTION_URL_LIMIT.toLocaleString('en-US')} characters.`} disabled={Boolean(pending)} />
          <TextInput label="Pull request URL" required value={resolutionFields.pullRequestUrl} onChange={event => { const value = event.currentTarget.value; setResolutionFields(fields => ({ ...fields, pullRequestUrl: value })) }} error={resolutionErrors.pullRequestUrl} description={`An HTTP(S) URL, up to ${RESOLUTION_URL_LIMIT.toLocaleString('en-US')} characters. Any provider is accepted.`} disabled={Boolean(pending)} />
        </> : <>
          <Textarea label="Explanation" required value={resolutionFields.explanation} onChange={event => { const value = event.currentTarget.value; setResolutionFields(fields => ({ ...fields, explanation: value })) }} error={resolutionErrors.explanation} description={`Up to ${RESOLUTION_TEXT_LIMIT.toLocaleString('en-US')} characters.`} rows={3} resize="vertical" disabled={Boolean(pending)} />
          {resolutionKind === 'duplicate' && <div>
            <p>Duplicate resolution uses the saved canonical report. Select and save its link separately before resolving.</p>
            {targets.status === 'loading' && <p role="status">Loading canonical reports…</p>}
            {targets.status === 'error' && <>
              <p role="alert">Canonical reports could not be loaded. Report details are still available.</p>
              <Button type="button" variant="default" disabled={Boolean(pending)} onClick={() => { setTargets({ status: 'loading' }); setTargetAttempt(attempt => attempt + 1) }}>Retry canonical reports</Button>
            </>}
            {targets.status === 'ready' && (targets.values.length === 0 ? <p>No other reports in this project are available to link.</p> : <>
              <NativeSelect label="Canonical report" description="Choose the original report by its title and ID. Resolved and Closed reports are eligible." value={canonicalId} onChange={event => { setCanonicalId(event.currentTarget.value); setCanonicalError('') }} error={canonicalError || resolutionErrors.canonicalReportId} disabled={Boolean(pending)} data={[
                { value: '', label: 'Choose a canonical report' }, ...targets.values.map(target => ({ value: target.id, label: `${target.title} (${target.id})` })),
              ]} />
              <Button type="button" mt="sm" disabled={mutationBlocked} onClick={saveCanonicalLink}>Save canonical link</Button>
            </>)}
            {report.canonicalReport ? <p>Saved canonical report: <CanonicalReportLink id={report.canonicalReport.id} title={report.canonicalReport.title} /></p> : <p>No canonical report has been saved.</p>}
          </div>}
        </>}
        <Group mt="sm" gap="sm">
          <Button type="submit" disabled={mutationBlocked}>Save resolution</Button>
          <Button type="button" variant="default" disabled={Boolean(pending)} onClick={() => { setResolutionOpen(false); setResolutionErrors({}) }}>Cancel resolution</Button>
        </Group>
      </form>}
      {report.state === 'Awaiting tester information' && <p className="report-waiting-note">Waiting for tester information. Comments do not change this state; the assigned developer resumes investigation manually.</p>}
      <Tabs value={tab} onChange={setTab} keepMounted className="report-tabs">
        <Tabs.List aria-label="Report sections">
          <Tabs.Tab value="conversation">Conversation</Tabs.Tab>
          <Tabs.Tab value="activity">Activity</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="conversation" pt="lg">
          <ReportFields report={report} />
          {questionsEligible && <section className="report-tester-questions" aria-labelledby="tester-questions-heading" aria-busy={questions.generating}>
            <Group justify="space-between" align="center" gap="sm" className="report-tester-questions-header">
              <h3 id="tester-questions-heading">Suggested tester questions</h3>
              <Badge variant="light" color="gray">Read-only</Badge>
            </Group>
            <p id="tester-questions-description" className="report-tester-questions-description">Optional AI-generated, read-only suggestions based on this saved report and its discussion. Review each question, then copy, edit and post it yourself. Nothing is posted automatically.</p>
            <Button type="button" variant="default" className="report-tester-questions-generate" aria-describedby="tester-questions-description" disabled={questions.generating || Boolean(questions.retryAfterMs) || comments.status !== 'ready'} onClick={() => {
              setCopyFeedback('')
              questions.generate()
            }}>{questions.result ? 'Generate again' : 'Generate tester questions'}</Button>
            {comments.status !== 'ready' && <p>Load the full discussion before generating tester questions.</p>}
            {questions.generating && <p role="status">Generating tester questions…</p>}
            {questions.error && <p role="alert">{questions.error}</p>}
            {questions.outdated && <p role="status">These suggestions are outdated because the saved report or discussion has changed. Generate again to use the current context.</p>}
            {questions.result && (questions.result.questions.length ? <ol className="report-tester-question-list">
              {questions.result.questions.map((question, index) => <li key={`${index}:${question}`}>
                <p className="report-tester-question-text">{question}</p>
                <Button type="button" variant="subtle" size="compact-sm" className="report-tester-question-copy" aria-label={`Copy question ${index + 1}`} onClick={() => void copyQuestion(question)}>Copy</Button>
              </li>)}
            </ol> : <p role="status">No useful follow-up questions were identified.</p>)}
            {copyFeedback && <p role="status">{copyFeedback}</p>}
          </section>}
          {report.canonicalReport && <p className="project-description">Current canonical report: <CanonicalReportLink id={report.canonicalReport.id} title={report.canonicalReport.title} /></p>}
          {report.resolution && <section className="report-resolution" aria-labelledby="report-resolution-heading">
            <h3 id="report-resolution-heading">Resolution</h3>
            <ResolutionValues resolution={report.resolution} />
            {report.resolution.kind === 'fixed'
              ? <p>The original Tester must retest this fix before closure. Tester retesting, closure, and reopening are not available yet.</p>
              : <p>No retest is required for this outcome. Tester closure and reopening are not available yet.</p>}
          </section>}
          <section id="report-discussion" className="report-discussion" tabIndex={-1} aria-labelledby="report-discussion-heading">
            <Group justify="space-between" align="center" gap="sm">
              <h3 id="report-discussion-heading">Discussion{commentCount === null ? '' : ` (${commentCount})`}</h3>
              {latestComment && <Button type="button" variant="subtle" size="compact-sm" onClick={() => jumpTo(`comment-${latestComment.id}`)}>Jump to latest</Button>}
            </Group>
            {comments.status === 'loading' && <p role="status">Loading discussion…</p>}
            {comments.status === 'error' && <>
              <p role="alert">Discussion could not be loaded. Your report details are still available.</p>
              <Button type="button" variant="default" disabled={Boolean(pending)} onClick={() => void loadComments()}>Retry discussion</Button>
            </>}
            {comments.status === 'ready' && <>
              {comments.values.length === 0 ? <p>No comments yet. Start the conversation below.</p> : <ol className="report-comments">
                {comments.values.map(comment => <Comment key={comment.id} comment={comment} comments={comments.values} archived={Boolean(report.projectArchivedAt)} onJump={jumpTo} onReply={() => {
                  setReplyTo(comment)
                  composer.current?.focus()
                  composer.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
                }} />)}
              </ol>}
            </>}
            {commentFeedback && <p role="alert">{commentFeedback}</p>}
            {report.projectArchivedAt ? <p className="report-readonly-note">This project is archived. Discussion is read-only until the project is restored.</p> : <form className="report-comment-form" onSubmit={event => void postComment(event)} aria-label="Post a comment" aria-busy={pending === 'comment'}>
              {replyTo && <div className="report-reply-selection">
                <span>Replying to {identityLabel(replyTo.authorDisplayName, replyTo.authorUsername)}</span>
                <Button type="button" variant="subtle" size="compact-sm" disabled={Boolean(pending)} onClick={() => setReplyTo(null)}>Cancel reply</Button>
              </div>}
              <Textarea ref={composer} label="Comment" description={`Up to ${COMMENT_TEXT_LIMIT.toLocaleString('en-US')} characters. Comments do not change report state. Unsaved text is lost when you leave or your session ends.`} value={body} onChange={event => setBody(event.currentTarget.value)} rows={4} resize="vertical" disabled={Boolean(pending)} />
              <Group justify="space-between" align="center" gap="sm" mt="sm">
                <small>{Array.from(body.trim()).length.toLocaleString('en-US')} / {COMMENT_TEXT_LIMIT.toLocaleString('en-US')} characters</small>
                <Button type="submit" disabled={mutationBlocked || comments.status !== 'ready'}>Post comment</Button>
              </Group>
              {pending === 'comment' && <p role="status">Posting comment…</p>}
            </form>}
          </section>
        </Tabs.Panel>
        <Tabs.Panel value="activity" pt="lg">
          <h3>Activity history</h3>
          {history.status === 'loading' && <p role="status">Loading activity…</p>}
          {history.status === 'error' && <>
            <p role="alert">Activity history could not be loaded. Your report details and discussion are still available.</p>
            <Button type="button" variant="default" disabled={Boolean(pending)} onClick={() => void loadHistory()}>Retry activity</Button>
          </>}
          {history.status === 'ready' && <ActivityHistory report={report} history={history.values} />}
        </Tabs.Panel>
      </Tabs>
    </>}
  </section>
}

function ReportHeader({ report }: { report: Report }) {
  const projectPath = `/projects/${report.projectId}`
  const reportsPath = `${projectPath}?tab=reports`
  return <header className="report-header">
    <p><Button component={Link} to={reportsPath} variant="default" className="report-navigation-button" leftSection={<span aria-hidden="true">←</span>}>Back to project reports</Button></p>
    <h2>{report.title}</h2>
    <dl className="report-facts">
      <div><dt>Project</dt><dd><Link to={projectPath}>{report.projectName}</Link></dd></div>
      <div><dt>Reporter</dt><dd>{identityLabel(report.reporterDisplayName, report.reporterUsername)}</dd></div>
      <div><dt>State</dt><dd><Badge variant="light" color={report.state === 'Open' ? 'gray' : report.state === 'Accepted' ? 'blue' : 'orange'}>{report.state}</Badge></dd></div>
      <div><dt>Assigned developer</dt><dd>{report.assignedDeveloperId ? identityLabel(report.assignedDeveloperDisplayName, report.assignedDeveloperUsername) : 'Unassigned'}</dd></div>
      <div><dt>Severity</dt><dd><Badge variant="light" color={report.severity === 'high' ? 'red' : 'gray'}>{REPORT_SEVERITIES[report.severity]}</Badge></dd></div>
    </dl>
  </header>
}

function ReportFields({ report }: { report: Report }) {
  return <details className="report-fields" open>
    <summary><h3>Report details</h3></summary>
    <dl className="report-timestamps">
      {report.assignedAt && <div><dt>Assigned</dt><dd><time dateTime={report.assignedAt}>{dateLabel(report.assignedAt)}</time></dd></div>}
      <div><dt>Created</dt><dd><time dateTime={report.createdAt}>{dateLabel(report.createdAt)}</time></dd></div>
      <div><dt>Updated</dt><dd><time dateTime={report.updatedAt}>{dateLabel(report.updatedAt)}</time></dd></div>
    </dl>
    <dl>
      {REPORT_TEXT_KEYS.filter(key => key !== 'title').map(key => <div key={key}>
        <dt>{REPORT_TEXT_FIELDS[key].label}</dt><dd className="project-description">{report[key] || 'Not provided'}</dd>
      </div>)}
    </dl>
  </details>
}

function Comment({ comment, comments, archived, onJump, onReply }: {
  comment: ReportComment; comments: ReportComment[]; archived: boolean; onJump: (id: string) => void; onReply: () => void
}) {
  const author = identityLabel(comment.authorDisplayName, comment.authorUsername)
  const original = comments.find(value => value.id === comment.replyToCommentId)
  return <li id={`comment-${comment.id}`} className="report-comment" tabIndex={-1}>
    <div className="report-comment-header">
      <strong>{author}</strong>
      <a href={`#comment-${comment.id}`} onClick={event => { event.preventDefault(); onJump(`comment-${comment.id}`) }}><time dateTime={comment.createdAt}>{dateLabel(comment.createdAt)}</time></a>
    </div>
    {comment.replyToCommentId && <p className="report-comment-reference">Reply to{' '}
      <a href={`#comment-${comment.replyToCommentId}`} onClick={event => { event.preventDefault(); onJump(`comment-${comment.replyToCommentId}`) }}>{original ? identityLabel(original.authorDisplayName, original.authorUsername) : 'earlier comment'}</a>
    </p>}
    <p className="report-comment-body">{comment.body}</p>
    {!archived && <Button type="button" variant="subtle" size="compact-sm" aria-label={`Reply to ${author}`} onClick={onReply}>Reply</Button>}
  </li>
}

function ActivityHistory({ report, history }: { report: Report; history: ReportHistoryEntry[] }) {
  const labels: Record<ReportHistoryEntry['event'], string> = {
    created: 'created this report', accepted: 'accepted this report', investigation_started: 'started investigation',
    tester_information_requested: 'requested tester information', investigation_resumed: 'resumed investigation',
    resolved: 'resolved this report', duplicate_linked: 'changed the canonical report link',
  }
  return history.length ? <ol className="project-history report-activity">{history.map(entry => <li key={entry.id}>
    <p><strong>{identityLabel(entry.actorDisplayName, entry.actorUsername || (entry.actorId === report.reporterId ? report.reporterUsername : null))}</strong>{' '}
      {labels[entry.event]} on <time dateTime={entry.occurredAt}>{dateLabel(entry.occurredAt)}</time>.</p>
    <details><summary>Recorded changes</summary><HistoryChanges entry={entry} report={report} /></details>
  </li>)}</ol> : <p>No activity history is available.</p>
}

function HistoryChanges({ entry, report }: { entry: ReportHistoryEntry; report: Report }) {
  if (entry.event === 'duplicate_linked') return <dl>
    <div><dt>Previous canonical report</dt><dd>{entry.changes.canonicalReportId.before ? <CanonicalReportLink id={entry.changes.canonicalReportId.before} /> : 'None'}</dd></div>
    <div><dt>New canonical report</dt><dd><CanonicalReportLink id={entry.changes.canonicalReportId.after} /></dd></div>
  </dl>
  if (entry.event !== 'created') return <dl>
    <div><dt>State</dt><dd>{entry.changes.state.before} → {entry.changes.state.after}</dd></div>
    {entry.event === 'accepted' && <>
      <div><dt>Assigned developer</dt><dd>Unassigned → {identityLabel(entry.assignedDeveloperDisplayName, entry.assignedDeveloperUsername)}</dd></div>
      <div><dt>Assigned</dt><dd><time dateTime={entry.changes.assignedAt.after}>{dateLabel(entry.changes.assignedAt.after)}</time></dd></div>
    </>}
    {entry.event === 'resolved' && <div><dt>Resolution snapshot</dt><dd><ResolutionValues resolution={entry.changes.resolution.after} /></dd></div>}
  </dl>
  return <dl>{(Object.keys(entry.changes) as (keyof ReportInput)[]).map(field => {
    const value = entry.changes[field]?.after ?? ''
    const label = field === 'projectId' && value === report.projectId ? report.projectName
      : field === 'severity' && Object.hasOwn(REPORT_SEVERITIES, value) ? REPORT_SEVERITIES[value as ReportSeverity] : value
    return <div key={field}><dt>{historyLabel(field)}</dt><dd className="project-description">{label || 'Not provided'}</dd></div>
  })}</dl>
}

function CanonicalReportLink({ id, title }: { id: string; title?: string }) {
  return <Link to={`/reports/${id}`}>{title ? `${title} (${id})` : id}</Link>
}

function ResolutionValues({ resolution }: { resolution: ReportResolution }) {
  return <dl className="report-resolution-values">
    <div><dt>Outcome</dt><dd>{resolutionLabels[resolution.kind]}</dd></div>
    {resolution.kind === 'fixed' ? <>
      <div><dt>Fix summary</dt><dd className="project-description">{resolution.fixSummary}</dd></div>
      <div><dt>Affected version</dt><dd className="project-description">{resolution.affectedVersion}</dd></div>
      <div><dt>Commit URL</dt><dd><a href={resolution.commitUrl} target="_blank" rel="noreferrer noopener">{resolution.commitUrl}</a></dd></div>
      <div><dt>Pull request URL</dt><dd><a href={resolution.pullRequestUrl} target="_blank" rel="noreferrer noopener">{resolution.pullRequestUrl}</a></dd></div>
    </> : <>
      <div><dt>Explanation</dt><dd className="project-description">{resolution.explanation}</dd></div>
      {resolution.kind === 'duplicate' && <div><dt>Canonical report at resolution</dt><dd><CanonicalReportLink id={resolution.canonicalReportId} /></dd></div>}
    </>}
    <div><dt>Resolved by</dt><dd>{identityLabel(resolution.authorDisplayName, resolution.authorUsername)}</dd></div>
    <div><dt>Resolved at</dt><dd><time dateTime={resolution.resolvedAt}>{dateLabel(resolution.resolvedAt)}</time></dd></div>
  </dl>
}
