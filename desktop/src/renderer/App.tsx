import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Sidebar } from './components/Sidebar'
import { CockpitPage } from './pages/CockpitPage'
import { AskSapPage } from './pages/AskSapPage'
import { CboPage } from './pages/CboPage'
import { KnowledgePage } from './pages/KnowledgePage'
import { SettingsPage } from './pages/SettingsPage'
import { useAppShellStore } from './stores/appShellStore'
import './components/ErrorBoundary.css'
import './styles/animations.css'
import './App.css'

// settingsStore를 import하면 초기 테마가 자동 적용됨
import './stores/settingsStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export function App() {
  const currentSection = useAppShellStore((state) => state.currentSection)

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="app-layout">
          <Sidebar />
          <main className="app-main">
            <div key={currentSection} className="app-page-shell page-enter">
              {currentSection === 'cockpit' && <CockpitPage />}
              {currentSection === 'ask-sap' && <AskSapPage />}
              {currentSection === 'cbo' && <CboPage />}
              {currentSection === 'knowledge' && <KnowledgePage />}
              {currentSection === 'settings' && <SettingsPage />}
            </div>
          </main>
        </div>
      </ErrorBoundary>
    </QueryClientProvider>
  )
}
