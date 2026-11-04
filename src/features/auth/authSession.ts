import type { Session } from '@supabase/supabase-js'
import type { SessionUser } from '../../shared/types/session'
import { AuthError } from './authService'
import type { AuthService } from './authService'

export type AuthState =
  | { status: 'authenticated'; user: SessionUser }
  | { status: 'loading' | 'signed_out' | 'incomplete_profile' | 'unavailable'; user: null }

export function createAuthSession(service: AuthService) {
  let state: AuthState = { status: 'loading', user: null }
  let active = false
  let revision = 0
  let unsubscribe: (() => void) | undefined
  const listeners = new Set<() => void>()

  function publish(next: AuthState) {
    state = next
    listeners.forEach(listener => listener())
  }

  async function resolveSession(session: Session | null, request: number) {
    if (!active || request !== revision) return
    if (!session) {
      publish({ status: 'signed_out', user: null })
      return
    }
    publish({ status: 'loading', user: null })
    try {
      const user = await service.loadIdentity(session.user.id)
      if (active && request === revision) publish({ status: 'authenticated', user })
    } catch (error) {
      if (active && request === revision) {
        publish({
          status: error instanceof AuthError && error.code === 'session_lost'
            ? 'signed_out'
            : error instanceof AuthError && error.code === 'incomplete_profile'
              ? 'incomplete_profile' : 'unavailable',
          user: null,
        })
      }
    }
  }

  async function retry() {
    const request = ++revision
    publish({ status: 'loading', user: null })
    try {
      const session = await service.getCurrentSession()
      await resolveSession(session, request)
    } catch {
      if (active && request === revision) publish({ status: 'unavailable', user: null })
    }
  }

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    start() {
      if (active) return
      active = true
      unsubscribe = service.onAuthStateChange((event, session) => {
        if (event === 'TOKEN_REFRESHED' && state.status === 'authenticated'
          && session?.user.id === state.user.id) return
        const request = ++revision
        // Clear protected identity before deferring any Supabase profile call.
        publish({ status: session ? 'loading' : 'signed_out', user: null })
        queueMicrotask(() => { void resolveSession(session, request) })
      })
      void retry()
    },
    stop() {
      active = false
      ++revision
      unsubscribe?.()
      unsubscribe = undefined
    },
    async signIn(email: string, password: string) {
      await service.signIn(email, password)
      await retry()
    },
    async signOut() {
      const request = ++revision
      publish({ status: 'signed_out', user: null })
      try {
        await service.signOut()
      } catch (error) {
        if (active && request === revision) publish({ status: 'unavailable', user: null })
        throw error
      }
    },
    retry,
  }
}
