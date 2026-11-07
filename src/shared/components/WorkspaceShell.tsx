import { useState } from 'react'
import type { ReactNode } from 'react'
import { AppShell, Badge, Button, Group, Text } from '@mantine/core'
import { Link, useLocation } from 'react-router'
import type { SessionUser } from '../../features/projects/types'

export function WorkspaceShell({ user, onSignOut, signOutPending, signOutError, children }: {
  user: SessionUser; onSignOut: () => void; signOutPending: boolean; signOutError: string; children: ReactNode
}) {
  const location = useLocation()
  const [menu, setMenu] = useState({ locationKey: location.key, opened: false })
  if (menu.locationKey !== location.key) {
    setMenu({ locationKey: location.key, opened: false })
  }
  const opened = menu.locationKey === location.key && menu.opened
  const drafts = location.pathname.startsWith('/drafts')
  return <AppShell header={{ height: { base: 112, sm: 76 } }} navbar={{ width: 232, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="lg">
    <AppShell.Header className="workspace-header">
      <Group gap="sm" className="workspace-heading">
        <Button className="navigation-toggle" variant="subtle" aria-label="Toggle navigation" aria-expanded={opened}
          aria-controls="workspace-navigation" onClick={() => setMenu({ locationKey: location.key, opened: !opened })}
          onKeyDown={event => { if (event.key === 'Escape') setMenu({ locationKey: location.key, opened: false }) }}>Menu</Button>
        <Text component="span" fw={700} size="xl" className="workspace-brand">BugWatch</Text>
      </Group>
      <Group gap="sm" className="workspace-account">
        <div><Text size="sm" fw={600} title={user.displayName}>{user.displayName}</Text><Badge size="sm" variant="light">{user.role}</Badge></div>
        <Button variant="default" disabled={signOutPending} onClick={onSignOut}>{signOutPending ? 'Logging out…' : 'Log out'}</Button>
      </Group>
    </AppShell.Header>
    <AppShell.Navbar p="md" id="workspace-navigation" className={`workspace-sidebar${opened ? ' is-open' : ''}`}
      onKeyDown={event => { if (event.key === 'Escape') { setMenu({ locationKey: location.key, opened: false }); document.querySelector<HTMLButtonElement>('.navigation-toggle')?.focus() } }}>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="sm">Workspace</Text>
      <nav aria-label="Workspace navigation">
        <Link to="/projects" aria-current={!drafts ? 'page' : undefined}>Projects</Link>
        {user.role === 'tester' && <Link to="/drafts" aria-current={drafts ? 'page' : undefined}>My drafts</Link>}
      </nav>
    </AppShell.Navbar>
    <AppShell.Main className="project-workspace">
      <div className="workspace-content">{signOutError && <p role="alert" className="project-message">{signOutError}</p>}{children}</div>
    </AppShell.Main>
  </AppShell>
}
