import '@testing-library/jest-dom/vitest'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { createMockApi } from './mocks/factories'

const mockApi = createMockApi()

Object.defineProperty(window, 'sapOpsDesktop', {
  value: mockApi,
  writable: true,
})

// 각 테스트 전에 모든 mock 초기화
beforeEach(() => {
  Object.values(mockApi).forEach((fn) => fn.mockClear())
})

// workspaceStore 초기화를 위한 헬퍼
export function resetWorkspaceStore() {
  useWorkspaceStore.setState({
    domainPack: 'ops',
  })
}

export { mockApi }
