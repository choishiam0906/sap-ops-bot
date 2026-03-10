import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWorkspaceStore, DOMAIN_PACK_DETAILS } from '../workspaceStore'
import type { DomainPack } from '../../../main/contracts'

describe('workspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      domainPack: 'ops',
    })
    vi.restoreAllMocks()
  })

  describe('setDomainPack', () => {
    it('domainPack을 변경하고 localStorage에 저장한다', () => {
      useWorkspaceStore.getState().setDomainPack('functional')

      expect(useWorkspaceStore.getState().domainPack).toBe('functional')
      expect(localStorage.getItem('sap-assistant-domain-pack')).toBe('functional')
    })

    it('모든 domainPack 값을 설정할 수 있다', () => {
      const packs: DomainPack[] = ['ops', 'functional', 'cbo-maintenance', 'pi-integration', 'btp-rap-cap']
      for (const pack of packs) {
        useWorkspaceStore.getState().setDomainPack(pack)
        expect(useWorkspaceStore.getState().domainPack).toBe(pack)
      }
    })
  })

  describe('applyRecommendedCboWorkspace', () => {
    it('cbo-maintenance를 한꺼번에 적용한다', () => {
      useWorkspaceStore.setState({ domainPack: 'ops' })
      useWorkspaceStore.getState().applyRecommendedCboWorkspace()

      expect(useWorkspaceStore.getState().domainPack).toBe('cbo-maintenance')
      expect(localStorage.getItem('sap-assistant-domain-pack')).toBe('cbo-maintenance')
    })
  })

  describe('localStorage 에러 처리', () => {
    it('localStorage.setItem 실패 시에도 상태는 정상 업데이트된다', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      useWorkspaceStore.getState().setDomainPack('functional')
      expect(useWorkspaceStore.getState().domainPack).toBe('functional')
    })
  })

  describe('상수 데이터 검증', () => {
    it('모든 DomainPack에 대한 상세 정보가 정의되어 있다', () => {
      const packs: DomainPack[] = ['ops', 'functional', 'cbo-maintenance', 'pi-integration', 'btp-rap-cap']
      for (const pack of packs) {
        const detail = DOMAIN_PACK_DETAILS[pack]
        expect(detail.label).toBeTruthy()
        expect(detail.chatTitle).toBeTruthy()
        expect(detail.suggestions.length).toBeGreaterThan(0)
      }
    })
  })
})
