import { useState } from 'react'
import { supabase } from '../../shared/lib/supabaseClient.js'
import { AuthProvider, useAuth } from './AuthProvider'
import { AuthError, createAuthService } from './authService'
import { LoginPage } from './LoginPage'

const service = createAuthService(supabase)

function AuthenticatedContent() {
  const auth = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function logout() {
    setPending(true)
    setError('')
    try {
      await auth.signOut()
    } catch (error) {
      setError(error instanceof AuthError ? error.message : 'Logout failed. Please try again.')
    } finally {
      setPending(false)
    }
  }

  if (auth.status === 'signed_out') return <LoginPage />
  if (auth.status === 'loading') return <p role="status">Loading your account…</p>

  return (
    <main className="project-workspace">
      <h1>BugWatch</h1>
      {auth.status === 'authenticated' ? (
        <section className="project-panel" key={auth.user.id}>
          <h2>Welcome, {auth.user.displayName}</h2>
          <p>Username: {auth.user.username}</p>
          <p>Role: {auth.user.role === 'developer' ? 'Developer' : 'Tester'}</p>
          <p>Your account is ready. Project storage is not connected yet.</p>
        </section>
      ) : auth.status === 'incomplete_profile' ? (
        <p role="alert">Account setup incomplete—contact the administrator.</p>
      ) : (
        <>
          <p role="alert">Authentication is unavailable. Please try again.</p>
          <button type="button" onClick={() => { void auth.retry() }} disabled={pending}>Retry</button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={() => { void logout() }} disabled={pending}>
        {pending ? 'Logging out…' : 'Log out'}
      </button>
    </main>
  )
}

export default function AuthenticatedApp() {
  return <AuthProvider service={service}><AuthenticatedContent /></AuthProvider>
}
