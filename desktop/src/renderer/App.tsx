import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Sidebar } from './components/Sidebar'
import { ChatPage } from './pages/ChatPage'
import { CboPage } from './pages/CboPage'
import { KnowledgeVaultPage } from './pages/KnowledgeVaultPage'
import { CockpitPage } from './pages/CockpitPage'
import { SourcesPage } from './pages/SourcesPage'
import { SkillsPage } from './pages/SkillsPage'
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
  const currentPage = useAppShellStore((state) => state.currentPage)
  const setCurrentPage = useAppShellStore((state) => state.setCurrentPage)

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="app-layout">
          <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
          <main className="app-main">
            <div key={currentPage} className="app-page-shell page-enter">
              {currentPage === 'chat' && <ChatPage />}
              {currentPage === 'cbo' && <CboPage />}
              {currentPage === 'audit' && <CockpitPage />}
              {currentPage === 'sources' && <SourcesPage />}
              {currentPage === 'skills' && <SkillsPage />}
              {currentPage === 'vault' && <KnowledgeVaultPage />}
              {currentPage === 'settings' && <SettingsPage />}
            </div>
          </main>
        </div>
      </ErrorBoundary>
    </QueryClientProvider>
  )
}
