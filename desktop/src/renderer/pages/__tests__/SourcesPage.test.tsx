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
    useWorkspaceStore.setState({ domainPack: 'cbo-maintenance' })
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

  it('등록된 Local Folder source 카드를 표시한다', async () => {
    renderWithProviders(<SourcesPage />)

    await waitFor(() => {
      expect(screen.getByText('FI CBO Sources')).toBeInTheDocument()
    })
    expect(screen.getByText('2 docs')).toBeInTheDocument()
    expect(screen.getByText('ready')).toBeInTheDocument()
  })

  it('재색인 버튼 클릭 시 reindexSource API를 호출한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SourcesPage />)

    await waitFor(() => {
      expect(screen.getByText('FI CBO Sources')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: '재색인' }))

    await waitFor(() => {
      expect(mockApi.reindexSource).toHaveBeenCalledWith('src1')
    })
  })

  it('문서 검색 결과를 표시한다', async () => {
    renderWithProviders(<SourcesPage />)

    await waitFor(() => {
      expect(mockApi.searchSourceDocuments).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByText('zsd_billing.txt')).toBeInTheDocument()
    })
  })

  it('문서 카드 클릭 시 미리보기 패널을 표시한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SourcesPage />)

    await waitFor(() => {
      expect(screen.getByText('zsd_billing.txt')).toBeInTheDocument()
    })

    await user.click(screen.getByText('zsd_billing.txt'))

    await waitFor(() => {
      expect(screen.getByText('REPORT ZSD_BILLING.')).toBeInTheDocument()
    })
  })

  it('MCPs 탭으로 전환하면 MCP 서버 목록을 조회한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SourcesPage />)

    await user.click(screen.getByRole('tab', { name: 'MCPs' }))

    await waitFor(() => {
      expect(mockApi.mcpListServers).toHaveBeenCalled()
    })

    expect(screen.getByText('MCP 서버 연결')).toBeInTheDocument()
    expect(screen.getByText('연결된 MCP 서버가 없습니다.')).toBeInTheDocument()
  })

  it('APIs 탭으로 전환하면 future-ready 안내를 표시한다', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SourcesPage />)

    await user.click(screen.getByRole('tab', { name: 'APIs' }))

    expect(screen.getByText('API Source Slots')).toBeInTheDocument()
  })

  it('폴더 등록 취소 시 취소 메시지를 표시한다', async () => {
    mockApi.pickAndAddLocalFolderSource.mockResolvedValueOnce({
      canceled: true,
      source: null,
      summary: null,
    })

    const user = userEvent.setup()
    renderWithProviders(<SourcesPage />)

    await user.click(screen.getByRole('button', { name: '폴더 선택 후 등록' }))

    await waitFor(() => {
      expect(screen.getByText('폴더 선택이 취소되었습니다.')).toBeInTheDocument()
    })
  })

  it('폴더 등록 실패 시 에러 메시지를 표시한다', async () => {
    mockApi.pickAndAddLocalFolderSource.mockRejectedValueOnce(new Error('권한 오류'))

    const user = userEvent.setup()
    renderWithProviders(<SourcesPage />)

    await user.click(screen.getByRole('button', { name: '폴더 선택 후 등록' }))

    await waitFor(() => {
      expect(screen.getByText('권한 오류')).toBeInTheDocument()
    })
  })
})
