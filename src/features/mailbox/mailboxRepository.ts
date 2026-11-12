import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReportInput } from '../reports/types'
import { REPORT_UUID } from '../reports/validation'
import { MailboxError } from './types'
import type { MailboxItem, MailboxRepository } from './types'

const fields = ['projectId', 'title', 'description', 'version', 'reproductionSteps', 'expectedResults', 'actualResults', 'severity', 'testEnvironment']

function fail(error?: unknown, status?: number): never {
  if (error instanceof MailboxError) throw error
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
  if (status === 401 || ['P2001', 'PGRST301', 'PGRST303'].includes(String(code))) throw new MailboxError('unauthenticated', 'Your session has ended. Please log in again.')
  if (code === 'P2002' || code === '42501') throw new MailboxError('forbidden', 'You do not have permission to access this mailbox item.')
  if (code === 'P2005') throw new MailboxError('not_found', 'The mailbox item could not be found.')
  throw new MailboxError('unavailable', 'Mailbox storage is unavailable. Please try again.')
}

function text(value: unknown): string {
  if (typeof value !== 'string') fail()
  return value
}

function uuid(value: unknown): string {
  const result = text(value)
  if (!REPORT_UUID.test(result)) fail()
  return result
}

function timestamp(value: unknown): string {
  const result = text(value)
  if (!Number.isFinite(Date.parse(result))) fail()
  return result
}

function itemRow(value: unknown): MailboxItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail()
  const row = value as Record<string, unknown>
  if (!Array.isArray(row.changed_fields) || !row.changed_fields.length
    || row.changed_fields.some(field => typeof field !== 'string' || !fields.includes(field))
    || new Set(row.changed_fields).size !== row.changed_fields.length) fail()
  return { id: uuid(row.id), reportId: uuid(row.report_id), actorId: uuid(row.actor_id),
    actorUsername: row.actor_username === null ? null : text(row.actor_username),
    actorDisplayName: row.actor_display_name === null ? null : text(row.actor_display_name),
    reportTitle: text(row.report_title), projectId: uuid(row.project_id), projectName: text(row.project_name),
    changedFields: row.changed_fields as (keyof ReportInput)[], createdAt: timestamp(row.created_at),
    readAt: row.read_at === null ? null : timestamp(row.read_at) }
}

function cursorKey(item: MailboxItem) {
  const fraction = /:\d{2}\.(\d{1,6})(?:Z|[+-]\d{2}:\d{2})$/i.exec(item.createdAt)?.[1] ?? ''
  return { time: BigInt(Date.parse(item.createdAt)) * 1000n + BigInt(fraction.padEnd(6, '0').slice(3)), id: item.id.toLowerCase() }
}

export function createMailboxRepository(client: SupabaseClient): MailboxRepository {
  async function rpc(operation: string, parameters: Record<string, unknown>): Promise<unknown> {
    try {
      const { data, error, status } = await client.rpc(operation, parameters)
      if (error) fail(error, status)
      return data
    } catch (error) { return fail(error) }
  }
  return {
    async listItems(filter) {
      if (filter !== 'all' && filter !== 'unread') fail()
      const items: MailboxItem[] = []
      const seen = new Set<string>()
      let previous: ReturnType<typeof cursorKey> | undefined
      let parameters: Record<string, unknown> = { p_filter: filter, p_cursor_created_at: null, p_cursor_id: null }
      for (;;) {
        const page = await rpc('get_mailbox_items', parameters)
        if (!Array.isArray(page) || page.length > 100) fail()
        for (const raw of page) {
          const item = itemRow(raw)
          const key = cursorKey(item)
          if ((filter === 'unread' && item.readAt !== null) || seen.has(key.id)
            || (previous && (key.time > previous.time || (key.time === previous.time && key.id >= previous.id)))) fail()
          seen.add(key.id)
          previous = key
          items.push(item)
          parameters = { p_filter: filter, p_cursor_created_at: item.createdAt, p_cursor_id: item.id }
        }
        if (page.length < 100) return items
      }
    },
    async markRead(id) {
      if (!REPORT_UUID.test(id)) throw new MailboxError('not_found', 'The mailbox item could not be found.')
      await rpc('mark_mailbox_item_read', { p_item_id: id })
    },
    async deleteItem(id) {
      if (!REPORT_UUID.test(id)) throw new MailboxError('not_found', 'The mailbox item could not be found.')
      await rpc('delete_mailbox_item', { p_item_id: id })
    },
  }
}
