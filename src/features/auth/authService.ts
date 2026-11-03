import type { Session, SupabaseClient } from '@supabase/supabase-js'
import type { SessionUser } from '../../shared/types/session'

type AuthErrorCode = 'invalid_credentials' | 'incomplete_profile' | 'unavailable' | 'session_lost'

export class AuthError extends Error {
  readonly code: AuthErrorCode

  constructor(code: AuthErrorCode) {
    const messages = {
      invalid_credentials: 'Email or password is incorrect.',
      incomplete_profile: 'Account setup incomplete—contact the administrator.',
      unavailable: 'Authentication is unavailable. Please try again.',
      session_lost: 'Your session has ended. Please log in again.',
    }
    super(messages[code])
    this.name = 'AuthError'
    this.code = code
  }
}

export interface AuthService {
  getCurrentSession(): Promise<Session | null>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  loadIdentity(authUserId: string): Promise<SessionUser>
  onAuthStateChange(callback: (session: Session | null) => void): () => void
}

function unavailable(error: unknown): never {
  throw error instanceof AuthError ? error : new AuthError('unavailable')
}

export function createAuthService(client: SupabaseClient): AuthService {
  return {
    async getCurrentSession() {
      try {
        const { data, error } = await client.auth.getSession()
        if (error) throw error
        return data.session
      } catch (error) {
        return unavailable(error)
      }
    },
    async signIn(email, password) {
      try {
        const { error } = await client.auth.signInWithPassword({ email, password })
        if (error) {
          if (error.code === 'invalid_credentials') throw new AuthError('invalid_credentials')
          throw error
        }
      } catch (error) {
        unavailable(error)
      }
    },
    async signOut() {
      try {
        const { error } = await client.auth.signOut()
        if (error) throw error
      } catch (error) {
        unavailable(error)
      }
    },
    async loadIdentity(authUserId) {
      try {
        const { data, error, status } = await client.from('profiles')
          .select('id, username, display_name, role').eq('id', authUserId).maybeSingle()
        if (error) {
          if (status === 401 || error.code === 'PGRST301' || error.code === 'PGRST303') {
            throw new AuthError('session_lost')
          }
          throw error
        }
        if (!data || data.id !== authUserId || typeof data.username !== 'string'
          || !data.username.trim() || typeof data.display_name !== 'string'
          || !data.display_name.trim() || (data.role !== 'tester' && data.role !== 'developer')) {
          throw new AuthError('incomplete_profile')
        }
        return { id: data.id, username: data.username, displayName: data.display_name, role: data.role }
      } catch (error) {
        return unavailable(error)
      }
    },
    onAuthStateChange(callback) {
      const { data } = client.auth.onAuthStateChange((_event, session) => callback(session))
      return () => data.subscription.unsubscribe()
    },
  }
}
