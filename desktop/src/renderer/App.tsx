import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Sidebar } from './components/Sidebar'
import { ChatPage } from './pages/ChatPage'
import { CboPage } from './pages/CboPage'
import { SettingsPage } from './pages/SettingsPage'
import './styles/animations.css'
import './App.css'

// settingsStore를 import하면 초기 테마가 자동 적용됨
import './stores/settingsStore'

type Page = 'chat' | 'cbo' | 'settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>('chat')

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app-layout">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="app-main">
          <div key={currentPage} className="page-enter">
            {currentPage === 'chat' && <ChatPage />}
            {currentPage === 'cbo' && <CboPage />}
            {currentPage === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>
    </QueryClientProvider>
  )
}
