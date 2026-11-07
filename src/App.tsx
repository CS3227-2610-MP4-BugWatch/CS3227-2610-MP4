import { lazy, Suspense } from 'react'
import { createTheme, MantineProvider } from '@mantine/core'
import './App.css'

const AuthenticatedApp = lazy(() => import('./features/auth/AuthenticatedApp'))
const theme = createTheme({ primaryColor: 'indigo', defaultRadius: 'md', fontFamily: 'Inter, system-ui, sans-serif', headings: { fontFamily: 'Inter, system-ui, sans-serif', fontWeight: '600' } })

function App() {
  return <MantineProvider theme={theme} defaultColorScheme="auto"><Suspense fallback={<p role="status">Loading BugWatch…</p>}>
    <AuthenticatedApp />
  </Suspense></MantineProvider>
}

export default App
