import { useState } from 'react'
import type { FormEvent } from 'react'
import { AuthError } from './authService'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError('')
    try {
      await signIn(email.trim(), password)
    } catch (error) {
      setError(error instanceof AuthError ? error.message : 'Authentication is unavailable. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="project-workspace">
      <h1>BugWatch</h1>
      <section className="project-panel" aria-labelledby="login-title">
        <h2 id="login-title">Log in</h2>
        <p>Use the account provided by your administrator.</p>
        <form onSubmit={submit}>
          <div className="project-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="username" required value={email}
              onChange={event => setEmail(event.target.value)} disabled={pending} />
          </div>
          <div className="project-field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" required value={password}
              onChange={event => setPassword(event.target.value)} disabled={pending} />
          </div>
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={pending}>{pending ? 'Logging in…' : 'Log in'}</button>
        </form>
      </section>
    </main>
  )
}
