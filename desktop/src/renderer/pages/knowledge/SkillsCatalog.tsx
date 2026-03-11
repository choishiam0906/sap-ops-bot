// ─── Skills 카탈로그: 프리셋 + 커스텀 스킬 관리 ───

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, FolderOpen, Pencil, Trash2 } from 'lucide-react'
import type { SapSkillDefinition } from '../../../main/contracts.js'
import { Badge } from '../../components/ui/Badge.js'
import { Button } from '../../components/ui/Button.js'
import { SkillEditor } from '../../components/knowledge/SkillEditor.js'
import { SkillsPage } from '../SkillsPage.js'
import '../../components/knowledge/AgentEditor.css'

const api = window.sapOpsDesktop

export function SkillsCatalog() {
  const queryClient = useQueryClient()
  const [editorMode, setEditorMode] = useState<'hidden' | 'new' | 'edit'>('hidden')
  const [editingSkill, setEditingSkill] = useState<SapSkillDefinition | null>(null)

  const { data: customSkills = [] } = useQuery({
    queryKey: ['skills', 'custom'],
    queryFn: () => api.listCustomSkills(),
    staleTime: 30_000,
  })

  if (editorMode !== 'hidden') {
    return (
      <SkillEditor
        skill={editingSkill ?? undefined}
        onSave={() => {
          setEditorMode('hidden')
          setEditingSkill(null)
          void queryClient.invalidateQueries({ queryKey: ['skills'] })
        }}
        onCancel={() => {
          setEditorMode('hidden')
          setEditingSkill(null)
        }}
      />
    )
  }

  return (
    <div>
      {/* 커스텀 스킬 액션 바 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px 0' }}>
        <Button variant="ghost" size="sm" onClick={() => api.openSkillFolder()}>
          <FolderOpen size={14} aria-hidden="true" />
          폴더
        </Button>
        <Button variant="primary" size="sm" onClick={() => { setEditorMode('new'); setEditingSkill(null) }}>
          <Plus size={14} aria-hidden="true" />
          새 스킬
        </Button>
      </div>

      {/* 기존 프리셋 스킬 페이지 */}
      <SkillsPage />

      {/* 커스텀 스킬 섹션 */}
      {customSkills.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div className="agents-section-label" style={{ marginBottom: 8 }}>내가 만든 스킬</div>
          <div className="agents-card-list">
            {customSkills.map((skill) => (
              <article key={skill.id} className="agent-card agent-card--custom">
                <div className="agent-card-header">
                  <div>
                    <strong>{skill.title}</strong>
                    <p>{skill.description}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="agent-card-action-btn"
                      onClick={() => { setEditingSkill(skill); setEditorMode('edit') }}
                      aria-label="편집"
                      title="편집"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      className="agent-card-action-btn"
                      onClick={async () => {
                        await api.deleteCustomSkill(`${skill.id}.skill.md`)
                        void queryClient.invalidateQueries({ queryKey: ['skills'] })
                      }}
                      aria-label="삭제"
                      title="삭제"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="agent-card-meta">
                  <Badge variant="warning">커스텀</Badge>
                  <Badge variant="neutral">{skill.outputFormat}</Badge>
                  {skill.supportedDomainPacks.map((dp) => (
                    <Badge key={dp} variant="neutral">{dp}</Badge>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
