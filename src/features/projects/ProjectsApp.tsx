import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import { ProjectDetailsPage } from './ProjectDetailsPage'
import { ProjectEditorPage } from './ProjectEditorPage'
import { ProjectListPage } from './ProjectListPage'
import type { ProjectRepository, SessionUser } from './types'
import { ReportCreatePage } from '../reports/ReportCreatePage'
import { ReportDetailsPage } from '../reports/ReportDetailsPage'
import type { ReportRepository } from '../reports/types'

export function ProjectsApp({ repository, reportRepository, user }: {
  repository: ProjectRepository; reportRepository: ReportRepository; user: SessionUser
}) {
  const location = useLocation()
  const pageKey = `${user.id}:${location.pathname}`
  return <Routes>
    <Route path="/" element={<Navigate replace to="/projects" />} />
    <Route path="/projects" element={<ProjectListPage key={pageKey} repository={repository} user={user} />} />
    <Route path="/projects/new" element={<ProjectEditorPage key={pageKey} repository={repository} user={user} />} />
    <Route path="/projects/:projectId" element={<ProjectDetailsPage key={pageKey} repository={repository} user={user} />} />
    <Route path="/projects/:projectId/edit" element={<ProjectEditorPage key={pageKey} repository={repository} user={user} />} />
    <Route path="/reports/new" element={<ReportCreatePage key={pageKey} projectRepository={repository} reportRepository={reportRepository} user={user} />} />
    <Route path="/reports/:reportId" element={<ReportDetailsPage key={pageKey} reportRepository={reportRepository} />} />
    <Route path="*" element={<section className="project-panel"><h2>Page not found</h2><Link to="/projects">Back to projects</Link></section>} />
  </Routes>
}
