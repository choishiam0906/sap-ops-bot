import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { SkillsPage } from '../SkillsPage'
import { mockApi } from '../../__tests__/setup'
import { useWorkspaceStore } from '../../stores/workspaceStore'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('SkillsPage', () => {
  beforeEach(() => {
    mockApi.listSkillPacks.mockResolvedValue([
      {
        id: 'cbo-ops-starter',
        title: 'CBO + Ops Starter Pack',
        description: 'CBO와 운영 중심 skill pack',
        audience: 'mixed',
        domainPacks: ['ops', 'cbo-maintenance', 'functional'],
        skillIds: ['cbo-impact-analysis', 'incident-triage', 'transport-risk-review'],
      },
    ])
    mockApi.listSkills.mockResolvedValue([
      {
        id: 'cbo-impact-analysis',
        title: 'CBO 변경 영향 분석',
        description: 'CBO 영향 분석',
        supportedDomainPacks: ['cbo-maintenance'],
        supportedDataTypes: ['chat', 'cbo'],
        allowedSecurityModes: ['secure-local', 'reference', 'hybrid-approved'],
        defaultPromptTemplate: '',
        outputFormat: 'structured-report',
        requiredSources: ['workspace-context', 'vault-confidential'],
        suggestedInputs: ['이 변경이 어떤 객체에 영향을 주는지 정리해줘'],
        suggestedTcodes: ['SE80'],
      },
    ])
    useWorkspaceStore.setState({ securityMode: 'secure-local', domainPack: 'cbo-maintenance' })
  })

  it('현재 워크스페이스에 맞는 skill pack과 skill catalog를 표시한다', async () => {
    renderWithProviders(<SkillsPage />)

    expect(screen.getByRole('heading', { name: 'Skills' })).toBeInTheDocument()

    await waitFor(() => {
      expect(mockApi.listSkillPacks).toHaveBeenCalled()
      expect(mockApi.listSkills).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByText('CBO + Ops Starter Pack')).toBeInTheDocument()
      expect(screen.getByText('CBO 변경 영향 분석')).toBeInTheDocument()
    })
  })
})
