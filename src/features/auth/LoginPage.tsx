import { Button, Paper, Text, Title } from '@mantine/core'
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
    <main className="auth-page">
      <div className="auth-brand"><Title order={1}>BugWatch</Title><Text c="dimmed">A clearer path from bug to resolution.</Text></div>
      <Paper component="section" className="project-panel" withBorder shadow="xs" aria-labelledby="login-title">
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
          <Button type="submit" fullWidth disabled={pending}>{pending ? 'Logging in…' : 'Log in'}</Button>
        </form>
      </Paper>
    </main>
  )
}
