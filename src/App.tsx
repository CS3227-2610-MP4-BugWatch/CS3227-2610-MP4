import { lazy, Suspense } from 'react'
import './App.css'

const AuthenticatedApp = lazy(() => import('./features/auth/AuthenticatedApp'))

function App() {
  return <Suspense fallback={<p role="status">Loading BugWatch...</p>}>
    <AuthenticatedApp />
  </Suspense>
}

export default App
