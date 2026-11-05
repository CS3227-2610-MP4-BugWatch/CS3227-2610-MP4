import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import { ProjectDetailsPage } from './ProjectDetailsPage'
import { ProjectEditorPage } from './ProjectEditorPage'
import { ProjectListPage } from './ProjectListPage'
import type { ProjectRepository, SessionUser } from './types'

export function ProjectsApp({ repository, user }: { repository: ProjectRepository; user: SessionUser }) {
  const location = useLocation()
  const pageKey = `${user.id}:${location.pathname}`
  return <Routes>
    <Route path="/" element={<Navigate replace to="/projects" />} />
    <Route path="/projects" element={<ProjectListPage key={pageKey} repository={repository} user={user} />} />
    <Route path="/projects/new" element={<ProjectEditorPage key={pageKey} repository={repository} user={user} />} />
    <Route path="/projects/:projectId" element={<ProjectDetailsPage key={pageKey} repository={repository} user={user} />} />
    <Route path="/projects/:projectId/edit" element={<ProjectEditorPage key={pageKey} repository={repository} user={user} />} />
    <Route path="*" element={<section className="project-panel"><h2>Page not found</h2><Link to="/projects">Back to projects</Link></section>} />
  </Routes>
}
