import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { SourcesPage } from '../SourcesPage'
import { mockApi } from '../../__tests__/setup'
import { useWorkspaceStore } from '../../stores/workspaceStore'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('SourcesPage', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ securityMode: 'secure-local', domainPack: 'cbo-maintenance' })
  })

  it('Local Folder / MCPs / APIs 탭을 표시한다', async () => {
    renderWithProviders(<SourcesPage />)

    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Local Folder' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'MCPs' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'APIs' })).toBeInTheDocument()

    await waitFor(() => {
      expect(mockApi.listConfiguredSources).toHaveBeenCalled()
    })
  })

  it('Local Folder 등록 버튼 클릭 시 picker API를 호출한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SourcesPage />)

    await user.click(screen.getByRole('button', { name: '폴더 선택 후 등록' }))

    await waitFor(() => {
      expect(mockApi.pickAndAddLocalFolderSource).toHaveBeenCalled()
    })
    expect(screen.getByText(/등록 완료:/)).toBeInTheDocument()
  })
})
