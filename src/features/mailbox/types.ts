import type { ReportInput } from '../reports/types'

export interface MailboxItem {
  id: string
  reportId: string
  actorId: string
  actorUsername: string | null
  actorDisplayName: string | null
  reportTitle: string
  projectId: string
  projectName: string
  changedFields: (keyof ReportInput)[]
  createdAt: string
  readAt: string | null
}

export class MailboxError extends Error {
  readonly code: 'unauthenticated' | 'forbidden' | 'not_found' | 'unavailable'

  constructor(code: MailboxError['code'], message: string) {
    super(message)
    this.name = 'MailboxError'
    this.code = code
  }
}

export interface MailboxRepository {
  listItems(filter: 'all' | 'unread'): Promise<MailboxItem[]>
  markRead(id: string): Promise<void>
  deleteItem(id: string): Promise<void>
}
