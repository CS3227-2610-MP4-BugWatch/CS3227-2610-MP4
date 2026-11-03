import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createAuthService } from '../features/auth/authService'

function clientDouble() {
  const unsubscribe = vi.fn()
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn<(callback: (event: string, session: Session | null) => void) => {
      data: { subscription: { unsubscribe: typeof unsubscribe } }
    }>(() => ({ data: { subscription: { unsubscribe } } })),
  }
  return { auth, unsubscribe, service: createAuthService({ auth } as unknown as SupabaseClient) }
}

describe('authentication service', () => {
  it('signIn_validCredentials_passesOnlyEmailAndPassword', async () => {
    const { service, auth } = clientDouble()
    await expect(service.signIn('alice@example.test', 'test-password')).resolves.toBeUndefined()
    expect(auth.signInWithPassword).toHaveBeenCalledExactlyOnceWith({
      email: 'alice@example.test', password: 'test-password',
    })
  })

  it('signIn_wrongCredentials_rejectsInvalidCredentials', async () => {
    const { service, auth } = clientDouble()
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { code: 'invalid_credentials', status: 400 } })
    await expect(service.signIn('alice@example.test', 'wrong')).rejects.toMatchObject({ code: 'invalid_credentials' })
  })

  it('signIn_serviceFailure_rejectsUnavailable', async () => {
    const { service, auth } = clientDouble()
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { code: 'unexpected_failure', status: 500 } })
    await expect(service.signIn('alice@example.test', 'password')).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('signIn_networkRejection_rejectsUnavailable', async () => {
    const { service, auth } = clientDouble()
    auth.signInWithPassword.mockRejectedValue(new Error('offline'))
    await expect(service.signIn('alice@example.test', 'password')).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('getCurrentSession_noSession_returnsNull', async () => {
    await expect(clientDouble().service.getCurrentSession()).resolves.toBeNull()
  })

  it('getCurrentSession_existingSession_returnsSameSession', async () => {
    const { service, auth } = clientDouble()
    const session = { user: { id: 'trusted-auth-id' } } as Session
    auth.getSession.mockResolvedValue({ data: { session }, error: null })
    await expect(service.getCurrentSession()).resolves.toBe(session)
  })

  it('getCurrentSession_error_rejectsUnavailable', async () => {
    const { service, auth } = clientDouble()
    auth.getSession.mockResolvedValue({ data: { session: null }, error: { message: 'offline' } })
    await expect(service.getCurrentSession()).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('signOut_success_resolvesAfterServiceCompletes', async () => {
    const { service, auth } = clientDouble()
    await expect(service.signOut()).resolves.toBeUndefined()
    expect(auth.signOut).toHaveBeenCalledOnce()
  })

  it('signOut_refused_rejectsUnavailable', async () => {
    const { service, auth } = clientDouble()
    auth.signOut.mockResolvedValue({ error: { message: 'logout refused' } })
    await expect(service.signOut()).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('onAuthStateChange_sessionEvents_forwardSessionAndReleaseSubscription', () => {
    const { service, auth, unsubscribe } = clientDouble()
    const callback = vi.fn()
    const cleanup = service.onAuthStateChange(callback)
    const listener = auth.onAuthStateChange.mock.calls[0]?.[0] as unknown as (event: string, session: Session | null) => void
    const session = { user: { id: 'trusted-auth-id' } } as Session
    listener('SIGNED_IN', session)
    listener('SIGNED_OUT', null)
    expect(callback.mock.calls).toEqual([[session], [null]])
    cleanup()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})
