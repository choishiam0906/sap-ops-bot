import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  SettingsSection,
  SettingsCard,
} from '../../components/settings/primitives/index.js'
import { Badge } from '../../components/ui/Badge.js'
import { Button } from '../../components/ui/Button.js'

const api = window.sapOpsDesktop

interface PolicyRule {
  id: string
  name: string
  description?: string
  conditions: Array<{ field: string; operator: string; value: unknown }>
  action: string
  priority: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

function actionLabel(action: string): string {
  switch (action) {
    case 'auto_approve': return '자동 승인'
    case 'require_approval': return '승인 필요'
    case 'deny': return '거부'
    default: return action
  }
}

function actionVariant(action: string): 'success' | 'warning' | 'info' | 'neutral' {
  switch (action) {
    case 'auto_approve': return 'success'
    case 'require_approval': return 'warning'
    case 'deny': return 'info'
    default: return 'neutral'
  }
}

export function PolicySettingsPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAction, setNewAction] = useState('require_approval')
  const [newField, setNewField] = useState('action')
  const [newValue, setNewValue] = useState('')

  const { data: rules = [] } = useQuery<PolicyRule[]>({
    queryKey: ['policy', 'rules'],
    queryFn: () => api.listPolicyRules(),
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      api.createPolicyRule({
        name: newName,
        conditions: [{ field: newField, operator: 'equals', value: newValue }],
        action: newAction,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['policy'] })
      setShowCreate(false)
      setNewName('')
      setNewValue('')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (rule: PolicyRule) =>
      api.updatePolicyRule(rule.id, { enabled: !rule.enabled }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['policy'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePolicyRule(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['policy'] }),
  })

  return (
    <div className="sp-page page-enter">
      <div className="sp-page-header">
        <h3>
          <Shield size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          정책 엔진
        </h3>
      </div>
      <div className="sp-page-scroll">
        <div className="sp-page-body">
          <div className="sp-page-sections">

            <SettingsSection title="정책 규칙">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <Button variant="primary" size="sm" onClick={() => setShowCreate(!showCreate)}>
                  <Plus size={14} aria-hidden="true" />
                  새 규칙
                </Button>
              </div>

              {showCreate && (
                <SettingsCard>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 8 }}>
                    <input
                      placeholder="규칙 이름"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      style={{
                        padding: '6px 8px', border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)',
                        color: 'var(--color-text)',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select
                        value={newField}
                        onChange={(e) => setNewField(e.target.value)}
                        style={{
                          flex: 1, padding: '6px 8px', border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)',
                          color: 'var(--color-text)',
                        }}
                      >
                        <option value="action">action</option>
                        <option value="provider">provider</option>
                        <option value="domain_pack">domain_pack</option>
                        <option value="skill_id">skill_id</option>
                        <option value="external_transfer">external_transfer</option>
                      </select>
                      <input
                        placeholder="값"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        style={{
                          flex: 1, padding: '6px 8px', border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)',
                          color: 'var(--color-text)',
                        }}
                      />
                    </div>
                    <select
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value)}
                      style={{
                        padding: '6px 8px', border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)',
                        color: 'var(--color-text)',
                      }}
                    >
                      <option value="auto_approve">자동 승인</option>
                      <option value="require_approval">승인 필요</option>
                      <option value="deny">거부</option>
                    </select>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>취소</Button>
                      <Button
                        variant="primary" size="sm"
                        onClick={() => createMutation.mutate()}
                        loading={createMutation.isPending}
                        disabled={!newName}
                      >
                        생성
                      </Button>
                    </div>
                  </div>
                </SettingsCard>
              )}

              {rules.map((rule) => (
                <SettingsCard key={rule.id}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 4,
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontSize: 'var(--font-size-sm)' }}>{rule.name}</strong>
                        <Badge variant={actionVariant(rule.action)}>{actionLabel(rule.action)}</Badge>
                        <Badge variant={rule.enabled ? 'success' : 'neutral'}>
                          {rule.enabled ? '활성' : '비활성'}
                        </Badge>
                      </div>
                      {rule.description && (
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                          {rule.description}
                        </p>
                      )}
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                        우선순위: {rule.priority} · 조건: {rule.conditions.length}개
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => toggleMutation.mutate(rule)}
                        title={rule.enabled ? '비활성화' : '활성화'}
                        aria-label={rule.enabled ? '비활성화' : '활성화'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}
                      >
                        {rule.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(rule.id)}
                        title="삭제"
                        aria-label="삭제"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: 4 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </SettingsCard>
              ))}

              {rules.length === 0 && !showCreate && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  등록된 정책 규칙이 없어요.
                </div>
              )}
            </SettingsSection>

          </div>
        </div>
      </div>
    </div>
  )
}
