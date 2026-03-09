import { describe, it, expect } from 'vitest'
import { PolicyEngine } from '../policyEngine.js'
import type { PolicyContext } from '../../contracts.js'

describe('PolicyEngine', () => {
  const engine = new PolicyEngine()

  const baseContext: PolicyContext = {
    securityMode: 'secure-local',
    domainPack: 'ops',
    dataType: 'chat',
  }

  it('secure-local 모드에서 외부 전송을 차단한다', () => {
    const decision = engine.evaluate({ ...baseContext, securityMode: 'secure-local' })

    expect(decision.allowed).toBe(false)
    expect(decision.reason).toBe('원문 외부 전송 차단')
    expect(decision.requiresApproval).toBe(false)
  })

  it('hybrid-approved 모드에서 승인을 요구한다', () => {
    const decision = engine.evaluate({ ...baseContext, securityMode: 'hybrid-approved' })

    expect(decision.allowed).toBe(false)
    expect(decision.reason).toBe('승인 필요')
    expect(decision.requiresApproval).toBe(true)
  })

  it('reference 모드에서 전송을 허용한다', () => {
    const decision = engine.evaluate({ ...baseContext, securityMode: 'reference' })

    expect(decision.allowed).toBe(true)
    expect(decision.reason).toBe('공개 지식 모드')
    expect(decision.requiresApproval).toBe(false)
  })

  it('domainPack이 다르더라도 securityMode 기준으로 판단한다', () => {
    const packs = ['ops', 'functional', 'cbo-maintenance', 'pi-integration', 'btp-rap-cap'] as const
    for (const domainPack of packs) {
      const decision = engine.evaluate({ securityMode: 'secure-local', domainPack, dataType: 'chat' })
      expect(decision.allowed).toBe(false)
    }
  })

  it('dataType이 cbo여도 동일한 정책을 적용한다', () => {
    const decision = engine.evaluate({ securityMode: 'reference', domainPack: 'cbo-maintenance', dataType: 'cbo' })
    expect(decision.allowed).toBe(true)
  })
})
