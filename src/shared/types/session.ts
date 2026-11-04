export interface SessionUser {
  id: string
  username: string
  displayName: string
  role: 'developer' | 'tester'
}
