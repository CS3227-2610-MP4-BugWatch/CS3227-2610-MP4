import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { AuthService } from './authService'
import { createAuthSession } from './authSession'
import type { AuthState } from './authSession'

export type AuthContextValue = AuthState & {
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  retry(): Promise<void>
  retryIfCurrent(): void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ service, children }: { service: AuthService; children: ReactNode }) {
  const controller = useMemo(() => createAuthSession(service), [service])
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  useEffect(() => {
    controller.start()
    return () => controller.stop()
  }, [controller])
  const value = useMemo(() => ({
    ...state,
    signIn: controller.signIn,
    signOut: controller.signOut,
    retry: controller.retry,
    retryIfCurrent: () => {
      // A request from a previous authenticated snapshot cannot reset a later session.
      if (state.status === 'authenticated' && controller.getSnapshot() === state) {
        void controller.retry()
      }
    },
  }), [state, controller])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider.')
  return value
}
