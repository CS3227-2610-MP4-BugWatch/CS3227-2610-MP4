import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createAuthService } from '../features/auth/authService'

const authId = '00000000-0000-4000-8000-000000000001'
const profile = { id: authId, username: 'Alice', display_name: 'Alice Example', role: 'tester' }

function lookup(data: unknown, error: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error })
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  const service = createAuthService({ from } as unknown as SupabaseClient)
  return { service, from, select, eq, maybeSingle }
}

describe('trusted profile lookup', () => {
  it.each(['tester', 'developer'])('loadIdentity_valid_%s_returnsTrustedIdentity', async role => {
    const { service, from, eq } = lookup({ ...profile, role })
    await expect(service.loadIdentity(authId)).resolves.toEqual({
      id: authId, username: 'Alice', displayName: 'Alice Example', role,
    })
    expect(from).toHaveBeenCalledExactlyOnceWith('profiles')
    expect(eq).toHaveBeenCalledExactlyOnceWith('id', authId)
  })

  it.each([
    ['missing row', null],
    ['missing id', { ...profile, id: undefined }],
    ['mismatched id', { ...profile, id: 'another-user' }],
    ['missing username', { ...profile, username: undefined }],
    ['empty username', { ...profile, username: '' }],
    ['blank username', { ...profile, username: ' \t\n' }],
    ['nontext username', { ...profile, username: 123 }],
    ['missing display name', { ...profile, display_name: undefined }],
    ['empty display name', { ...profile, display_name: '' }],
    ['blank display name', { ...profile, display_name: '  ' }],
    ['nontext display name', { ...profile, display_name: false }],
    ['missing role', { ...profile, role: undefined }],
    ['unknown role', { ...profile, role: 'admin' }],
    ['wrong role case', { ...profile, role: 'Tester' }],
    ['array response', [profile]],
  ])('loadIdentity_%s_rejectsIncompleteProfile', async (_label, data) => {
    await expect(lookup(data).service.loadIdentity(authId)).rejects.toMatchObject({ code: 'incomplete_profile' })
  })

  it('loadIdentity_queryFailure_rejectsUnavailableRatherThanIncomplete', async () => {
    await expect(lookup(null, { message: 'network failure' }).service.loadIdentity(authId))
      .rejects.toMatchObject({ code: 'unavailable' })
  })

  it('loadIdentity_rejectedRequest_rejectsUnavailable', async () => {
    const { service, maybeSingle } = lookup(null)
    maybeSingle.mockRejectedValue(new Error('offline'))
    await expect(service.loadIdentity(authId)).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('loadIdentity_http401Response_rejectsSessionLost', async () => {
    const { service, maybeSingle } = lookup(null)
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'Unauthorized' }, status: 401 })
    await expect(service.loadIdentity(authId)).rejects.toMatchObject({ code: 'session_lost' })
  })

  it.each(['PGRST301', 'PGRST303'])('loadIdentity_expiredJwt_%s_rejectsSessionLost', async code => {
    const { service } = lookup(null, { code, message: 'JWT expired or invalid' })
    await expect(service.loadIdentity(authId)).rejects.toMatchObject({ code: 'session_lost' })
  })

  it('loadIdentity_http503Response_remainsRecoverableUnavailable', async () => {
    const { service, maybeSingle } = lookup(null)
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'Service unavailable' }, status: 503 })
    await expect(service.loadIdentity(authId)).rejects.toMatchObject({ code: 'unavailable' })
  })
})
