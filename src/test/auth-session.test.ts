import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { AuthError, type AuthService } from '../features/auth/authService'
import { createAuthSession } from '../features/auth/authSession'
import type { SessionUser } from '../shared/types/session'

const user: SessionUser = { id: 'alice-id', username: 'Alice', displayName: 'Alice Example', role: 'tester' }
const session = { user: { id: user.id } } as Session

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function setup(initialSession: Session | null = session) {
  let emit: (event: AuthChangeEvent, session: Session | null) => void = () => undefined
  const unsubscribe = vi.fn()
  const service = {
    getCurrentSession: vi.fn<AuthService['getCurrentSession']>().mockResolvedValue(initialSession),
    signIn: vi.fn<AuthService['signIn']>().mockResolvedValue(undefined),
    signOut: vi.fn<AuthService['signOut']>().mockResolvedValue(undefined),
    loadIdentity: vi.fn<AuthService['loadIdentity']>().mockResolvedValue(user),
    onAuthStateChange: vi.fn<AuthService['onAuthStateChange']>(callback => {
      emit = callback
      return unsubscribe
    }),
  }
  const controller = createAuthSession(service)
  return { controller, service, unsubscribe, emit: (event: AuthChangeEvent, value: Session | null) => emit(event, value) }
}

async function expectState(controller: ReturnType<typeof createAuthSession>, status: string) {
  await vi.waitFor(() => expect(controller.getSnapshot().status).toBe(status))
}

describe('shared authentication lifecycle', () => {
  it.each(['tester', 'developer'] as const)('start_valid_%s_restoresTrustedIdentityAfterLoading', async role => {
    const { controller, service } = setup()
    service.loadIdentity.mockResolvedValue({ ...user, role })
    expect(controller.getSnapshot()).toEqual({ status: 'loading', user: null })
    controller.start()
    await expectState(controller, 'authenticated')
    expect(controller.getSnapshot()).toEqual({ status: 'authenticated', user: { ...user, role } })
    expect(service.loadIdentity).toHaveBeenCalledWith(user.id)
    controller.stop()
  })

  it('start_noSession_becomesSignedOutWithoutProfileLookup', async () => {
    const { controller, service } = setup(null)
    controller.start()
    await expectState(controller, 'signed_out')
    expect(controller.getSnapshot().user).toBeNull()
    expect(service.loadIdentity).not.toHaveBeenCalled()
    controller.stop()
  })

  it('start_missingProfile_blocksIdentityWithoutDefaultRole', async () => {
    const { controller, service } = setup()
    service.loadIdentity.mockRejectedValue(new AuthError('incomplete_profile'))
    controller.start()
    await expectState(controller, 'incomplete_profile')
    expect(controller.getSnapshot().user).toBeNull()
    controller.stop()
  })

  it('retry_transientLookupFailure_restoresSameSessionIdentity', async () => {
    const { controller, service } = setup()
    service.loadIdentity.mockRejectedValueOnce(new AuthError('unavailable')).mockResolvedValue(user)
    controller.start()
    await expectState(controller, 'unavailable')
    expect(controller.getSnapshot().user).toBeNull()
    await controller.retry()
    expect(controller.getSnapshot()).toEqual({ status: 'authenticated', user })
    controller.stop()
  })

  it('start_sessionRestorationFailure_blocksContentAndAllowsRetry', async () => {
    const { controller, service } = setup()
    service.getCurrentSession.mockRejectedValueOnce(new AuthError('unavailable')).mockResolvedValue(session)
    controller.start()
    await expectState(controller, 'unavailable')
    await controller.retry()
    expect(controller.getSnapshot()).toEqual({ status: 'authenticated', user })
    controller.stop()
  })

  it('signIn_signedOut_loadsTrustedProfile', async () => {
    const { controller, service } = setup(null)
    controller.start()
    await expectState(controller, 'signed_out')
    service.getCurrentSession.mockResolvedValue(session)
    await controller.signIn('alice@example.test', 'password')
    expect(service.signIn).toHaveBeenCalledWith('alice@example.test', 'password')
    expect(controller.getSnapshot()).toEqual({ status: 'authenticated', user })
    controller.stop()
  })

  it('signIn_wrongCredentials_doesNotExposeIdentityAndPropagatesFailure', async () => {
    const { controller, service } = setup(null)
    controller.start()
    await expectState(controller, 'signed_out')
    service.signIn.mockRejectedValue(new AuthError('invalid_credentials'))
    await expect(controller.signIn('alice@example.test', 'wrong')).rejects.toMatchObject({ code: 'invalid_credentials' })
    expect(controller.getSnapshot().user).toBeNull()
    expect(service.loadIdentity).not.toHaveBeenCalled()
    controller.stop()
  })

  it('signOut_pendingRequest_removesIdentityImmediatelyThenShowsLogin', async () => {
    const { controller, service } = setup()
    controller.start()
    await expectState(controller, 'authenticated')
    const pending = deferred<void>()
    service.signOut.mockReturnValue(pending.promise)
    const logout = controller.signOut()
    expect(controller.getSnapshot().user).toBeNull()
    pending.resolve(undefined)
    await logout
    expect(controller.getSnapshot()).toEqual({ status: 'signed_out', user: null })
    controller.stop()
  })

  it('signOut_refused_blocksContentAndReportsFailure', async () => {
    const { controller, service } = setup()
    controller.start()
    await expectState(controller, 'authenticated')
    service.signOut.mockRejectedValue(new AuthError('unavailable'))
    await expect(controller.signOut()).rejects.toMatchObject({ code: 'unavailable' })
    expect(controller.getSnapshot()).toEqual({ status: 'unavailable', user: null })
    controller.stop()
  })

  it('signOut_oldFailureAfterNewAuthEvent_preservesNewestTrustedIdentity', async () => {
    const { controller, service, emit } = setup()
    controller.start()
    await expectState(controller, 'authenticated')
    const pending = deferred<void>()
    service.signOut.mockReturnValue(pending.promise)
    const logout = controller.signOut()
    const rejection = expect(logout).rejects.toMatchObject({ code: 'unavailable' })
    expect(controller.getSnapshot().user).toBeNull()

    const otherUser: SessionUser = { ...user, id: 'bob-id', username: 'Bob', role: 'developer' }
    service.loadIdentity.mockResolvedValue(otherUser)
    emit('SIGNED_IN', { user: { id: otherUser.id } } as Session)
    await expectState(controller, 'authenticated')
    expect(controller.getSnapshot()).toEqual({ status: 'authenticated', user: otherUser })

    pending.reject(new AuthError('unavailable'))
    await rejection
    expect(controller.getSnapshot()).toEqual({ status: 'authenticated', user: otherUser })
    controller.stop()
  })

  it('authEvent_sessionLoss_removesIdentitySynchronously', async () => {
    const { controller, emit } = setup()
    controller.start()
    await expectState(controller, 'authenticated')
    emit('SIGNED_OUT', null)
    expect(controller.getSnapshot()).toEqual({ status: 'signed_out', user: null })
    controller.stop()
  })

  it('authEvent_sameUserTokenRefresh_preservesAuthenticatedSnapshotWithoutLookupOrNotifications', async () => {
    const { controller, service, emit } = setup()
    controller.start()
    await expectState(controller, 'authenticated')
    const snapshot = controller.getSnapshot()
    const listener = vi.fn()
    const unsubscribe = controller.subscribe(listener)
    const refreshedSession = { ...session, access_token: 'renewed-token' }

    emit('TOKEN_REFRESHED', refreshedSession)
    expect(controller.getSnapshot()).toBe(snapshot)
    await Promise.resolve()
    await Promise.resolve()

    expect(controller.getSnapshot()).toBe(snapshot)
    expect(service.loadIdentity).toHaveBeenCalledExactlyOnceWith(user.id)
    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
    controller.stop()
  })

  it('authEvent_tokenRefreshWithoutSession_removesIdentitySynchronouslyWithoutLookup', async () => {
    const { controller, service, emit } = setup()
    controller.start()
    await expectState(controller, 'authenticated')

    emit('TOKEN_REFRESHED', null)
    expect(controller.getSnapshot()).toEqual({ status: 'signed_out', user: null })
    await Promise.resolve()
    expect(controller.getSnapshot()).toEqual({ status: 'signed_out', user: null })
    expect(service.loadIdentity).toHaveBeenCalledExactlyOnceWith(user.id)
    controller.stop()
  })

  it('authEvent_differentUserTokenRefresh_clearsOldIdentityAndLoadsNewTrustedProfile', async () => {
    const { controller, service, emit } = setup()
    controller.start()
    await expectState(controller, 'authenticated')
    const pending = deferred<SessionUser>()
    const otherUser: SessionUser = { ...user, id: 'bob-id', username: 'Bob', role: 'developer' }
    service.loadIdentity.mockReturnValue(pending.promise)

    emit('TOKEN_REFRESHED', { user: { id: otherUser.id } } as Session)
    expect(controller.getSnapshot()).toEqual({ status: 'loading', user: null })
    await vi.waitFor(() => expect(service.loadIdentity).toHaveBeenLastCalledWith(otherUser.id))
    expect(controller.getSnapshot()).toEqual({ status: 'loading', user: null })

    pending.resolve(otherUser)
    await expectState(controller, 'authenticated')
    expect(controller.getSnapshot()).toEqual({ status: 'authenticated', user: otherUser })
    controller.stop()
  })

  it('authEvent_tokenRefreshWhileSignedOut_loadsTrustedProfileBeforeAuthenticating', async () => {
    const { controller, service, emit } = setup(null)
    controller.start()
    await expectState(controller, 'signed_out')
    const pending = deferred<SessionUser>()
    service.loadIdentity.mockReturnValue(pending.promise)

    emit('TOKEN_REFRESHED', session)
    expect(controller.getSnapshot()).toEqual({ status: 'loading', user: null })
    await vi.waitFor(() => expect(service.loadIdentity).toHaveBeenCalledExactlyOnceWith(user.id))
    expect(controller.getSnapshot().user).toBeNull()

    pending.resolve(user)
    await expectState(controller, 'authenticated')
    expect(controller.getSnapshot()).toEqual({ status: 'authenticated', user })
    controller.stop()
  })

  it('retry_profileRejectsExpiredSession_clearsAuthenticatedIdentityAndReturnsToLogin', async () => {
    const { controller, service } = setup()
    controller.start()
    await expectState(controller, 'authenticated')
    const pending = deferred<SessionUser>()
    service.loadIdentity.mockReturnValue(pending.promise)
    const retry = controller.retry()
    expect(controller.getSnapshot().user).toBeNull()
    pending.reject(new AuthError('session_lost'))
    await retry
    expect(controller.getSnapshot()).toEqual({ status: 'signed_out', user: null })
    controller.stop()
  })

  it('start_profileRejectsExpiredSession_returnsToLoginWithoutIdentity', async () => {
    const { controller, service } = setup()
    service.loadIdentity.mockRejectedValue(new AuthError('session_lost'))
    controller.start()
    await expectState(controller, 'signed_out')
    expect(controller.getSnapshot().user).toBeNull()
    controller.stop()
  })

  it('authEvent_oldSessionLostRejection_doesNotSignOutNewerTrustedIdentity', async () => {
    const { controller, service, emit } = setup()
    const pending = deferred<SessionUser>()
    const otherUser: SessionUser = { ...user, id: 'bob-id', username: 'Bob', role: 'developer' }
    service.loadIdentity.mockReturnValueOnce(pending.promise).mockResolvedValue(otherUser)
    controller.start()
    await vi.waitFor(() => expect(service.loadIdentity).toHaveBeenCalledOnce())
    emit('SIGNED_IN', { user: { id: otherUser.id } } as Session)
    await expectState(controller, 'authenticated')
    pending.reject(new AuthError('session_lost'))
    await Promise.resolve()
    await Promise.resolve()
    expect(controller.getSnapshot()).toEqual({ status: 'authenticated', user: otherUser })
    controller.stop()
  })

  it('authEvent_signoutDuringProfileLookup_ignoresLateIdentity', async () => {
    const { controller, service, emit } = setup()
    const pending = deferred<SessionUser>()
    service.loadIdentity.mockReturnValue(pending.promise)
    controller.start()
    await vi.waitFor(() => expect(service.loadIdentity).toHaveBeenCalledOnce())
    emit('SIGNED_OUT', null)
    pending.resolve(user)
    await Promise.resolve()
    await Promise.resolve()
    expect(controller.getSnapshot()).toEqual({ status: 'signed_out', user: null })
    controller.stop()
  })

  it('authEvent_newIdentity_supersedesOlderProfileResult', async () => {
    const { controller, service, emit } = setup()
    const pending = deferred<SessionUser>()
    const otherUser: SessionUser = { ...user, id: 'bob-id', username: 'Bob', role: 'developer' }
    service.loadIdentity.mockReturnValueOnce(pending.promise).mockResolvedValue(otherUser)
    controller.start()
    await vi.waitFor(() => expect(service.loadIdentity).toHaveBeenCalledOnce())
    emit('SIGNED_IN', { user: { id: otherUser.id } } as Session)
    await expectState(controller, 'authenticated')
    pending.resolve(user)
    await Promise.resolve()
    await Promise.resolve()
    expect(controller.getSnapshot()).toEqual({ status: 'authenticated', user: otherUser })
    controller.stop()
  })

  it('authEvent_beforeRestorationCompletes_supersedesStaleRestoredSession', async () => {
    const { controller, service, emit } = setup()
    const pending = deferred<Session | null>()
    service.getCurrentSession.mockReturnValue(pending.promise)
    controller.start()
    emit('SIGNED_OUT', null)
    pending.resolve(session)
    await Promise.resolve()
    await Promise.resolve()
    expect(controller.getSnapshot()).toEqual({ status: 'signed_out', user: null })
    expect(service.loadIdentity).not.toHaveBeenCalled()
    controller.stop()
  })

  it('stop_pendingLookup_unsubscribesAndSuppressesLateNotifications', async () => {
    const { controller, service, unsubscribe } = setup()
    const pending = deferred<SessionUser>()
    service.loadIdentity.mockReturnValue(pending.promise)
    const listener = vi.fn()
    const removeListener = controller.subscribe(listener)
    controller.start()
    await vi.waitFor(() => expect(service.loadIdentity).toHaveBeenCalledOnce())
    controller.stop()
    listener.mockClear()
    pending.resolve(user)
    await Promise.resolve()
    await Promise.resolve()
    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(listener).not.toHaveBeenCalled()
    expect(controller.getSnapshot().user).toBeNull()
    removeListener()
  })
})
