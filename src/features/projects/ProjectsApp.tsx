import { WorkspaceShell } from '../../shared/components/WorkspaceShell'
import { useMemo } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import { ProjectDetailsPage } from './ProjectDetailsPage'
import { ProjectEditorPage } from './ProjectEditorPage'
import { ProjectListPage } from './ProjectListPage'
import type { ProjectRepository, SessionUser } from './types'
import { DraftListPage } from '../reports/DraftListPage'
import { DraftEditPage } from '../reports/DraftEditPage'
import { ReportCreatePage } from '../reports/ReportCreatePage'
import { ReportDetailsPage } from '../reports/ReportDetailsPage'
import type { ReportDraft, ReportRepository } from '../reports/types'

export function ProjectsApp({ repository, reportRepository, user, onSignOut = () => {}, signOutPending = false, signOutError = '' }: {
  repository: ProjectRepository; reportRepository: ReportRepository; user: SessionUser
  onSignOut?: () => void; signOutPending?: boolean; signOutError?: string
}) {
  const draftCache = useMemo(() => ({ userId: user.id, drafts: new Map<string, ReportDraft>() }), [user.id])
  const savedDrafts = draftCache.drafts
  const location = useLocation()
  const pageKey = `${user.id}:${location.pathname}`
  return <WorkspaceShell user={user} onSignOut={onSignOut} signOutPending={signOutPending} signOutError={signOutError}><Routes>
    <Route path="/" element={<Navigate replace to="/projects" />} />
    <Route path="/projects" element={<ProjectListPage key={pageKey} repository={repository} user={user} />} />
    <Route path="/projects/new" element={<ProjectEditorPage key={pageKey} repository={repository} user={user} />} />
    <Route path="/projects/:projectId" element={<ProjectDetailsPage key={pageKey} repository={repository} reportRepository={reportRepository} user={user} />} />
    <Route path="/projects/:projectId/edit" element={<ProjectEditorPage key={pageKey} repository={repository} user={user} />} />
    <Route path="/drafts" element={<DraftListPage key={pageKey} repository={reportRepository} user={user} />} />
    <Route path="/drafts/:draftId" element={<DraftEditPage key={pageKey} projectRepository={repository} reportRepository={reportRepository} user={user} savedDrafts={savedDrafts} />} />
    <Route path="/reports/new" element={<ReportCreatePage key={pageKey} projectRepository={repository} reportRepository={reportRepository} user={user} savedDrafts={savedDrafts} />} />
    <Route path="/reports/:reportId" element={<ReportDetailsPage key={pageKey} reportRepository={reportRepository} user={user} />} />
    <Route path="*" element={<section className="project-panel"><h2>Page not found</h2><Link to="/projects">Back to projects</Link></section>} />
  </Routes></WorkspaceShell>
}
