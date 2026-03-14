import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Clock, Play, Pause, Trash2, Plus, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '../../components/ui/Badge.js'
import { Button } from '../../components/ui/Button.js'
import { PageHeader } from '../../components/ui/PageHeader.js'

const api = window.sapOpsDesktop

interface ScheduledTask {
  id: string
  templateId: string
  cronExpression: string
  enabled: boolean
  lastRunAt: string | null
  nextRunAt: string | null
  createdAt: string
}

interface ScheduleLog {
  id: string
  scheduledTaskId: string
  status: 'success' | 'failed' | 'skipped'
  resultJson: string | null
  errorMessage: string | null
  startedAt: string
  finishedAt: string | null
}

interface RoutineTemplate {
  id: string
  name: string
  frequency: string
  description?: string
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function statusIcon(status: ScheduleLog['status']) {
  switch (status) {
    case 'success': return <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
    case 'failed': return <XCircle size={14} style={{ color: 'var(--color-error)' }} />
    case 'skipped': return <AlertTriangle size={14} style={{ color: 'var(--color-warning)' }} />
  }
}

export function SchedulePanel() {
  const queryClient = useQueryClient()
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCron, setNewCron] = useState('0 9 * * 1-5')
  const [newTemplateId, setNewTemplateId] = useState('')

  const { data: tasks = [] } = useQuery<ScheduledTask[]>({
    queryKey: ['schedule', 'tasks'],
    queryFn: () => api.listScheduledTasks(),
    staleTime: 10_000,
  })

  const { data: templates = [] } = useQuery<RoutineTemplate[]>({
    queryKey: ['routine', 'templates'],
    queryFn: () => api.listRoutineTemplates(),
    staleTime: 60_000,
  })

  const { data: logs = [] } = useQuery<ScheduleLog[]>({
    queryKey: ['schedule', 'logs', selectedTaskId],
    queryFn: () =>
      selectedTaskId
        ? api.listScheduleLogs(selectedTaskId, 20)
        : api.listRecentScheduleLogs(20),
    staleTime: 5_000,
  })

  const createMutation = useMutation({
    mutationFn: () => api.createScheduledTask({
      templateId: newTemplateId,
      cronExpression: newCron,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedule'] })
      setShowCreateForm(false)
      setNewCron('0 9 * * 1-5')
      setNewTemplateId('')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (task: ScheduledTask) =>
      api.updateScheduledTask(task.id, { enabled: !task.enabled }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['schedule'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteScheduledTask(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedule'] })
      if (selectedTaskId) setSelectedTaskId(null)
    },
  })

  const executeNowMutation = useMutation({
    mutationFn: (id: string) => api.executeScheduleNow(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['schedule'] }),
  })

  const templateMap = new Map(templates.map((t) => [t.id, t]))

  return (
    <div className="schedule-panel">
      <PageHeader
        title="스케줄 자동 실행"
        description="cron 기반 루틴 스케줄을 관리하고 실행 이력을 확인하세요"
      />

      <div className="schedule-actions" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button variant="primary" size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus size={14} aria-hidden="true" />
          새 스케줄
        </Button>
      </div>

      {/* 생성 폼 */}
      {showCreateForm && (
        <div style={{
          padding: 16, border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', marginBottom: 16,
          background: 'var(--color-bg-secondary)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                루틴 템플릿
              </span>
              <select
                value={newTemplateId}
                onChange={(e) => setNewTemplateId(e.target.value)}
                style={{
                  display: 'block', width: '100%', marginTop: 4, padding: '6px 8px',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-bg)', color: 'var(--color-text)',
                }}
              >
                <option value="">선택하세요</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.frequency})</option>
                ))}
              </select>
            </label>
            <label>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Cron 표현식
              </span>
              <input
                type="text"
                value={newCron}
                onChange={(e) => setNewCron(e.target.value)}
                placeholder="0 9 * * 1-5"
                style={{
                  display: 'block', width: '100%', marginTop: 4, padding: '6px 8px',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-bg)', color: 'var(--color-text)',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                취소
              </Button>
              <Button
                variant="primary" size="sm"
                onClick={() => createMutation.mutate()}
                loading={createMutation.isPending}
                disabled={!newTemplateId || !newCron}
              >
                생성
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 스케줄 목록 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section>
          <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
            스케줄 목록
          </h4>
          {tasks.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              등록된 스케줄이 없어요. 새 스케줄을 추가해보세요.
            </div>
          )}
          {tasks.map((task) => {
            const tmpl = templateMap.get(task.templateId)
            return (
              <article
                key={task.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedTaskId(task.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedTaskId(task.id) }
                }}
                style={{
                  padding: 12, border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)', marginBottom: 8, cursor: 'pointer',
                  background: selectedTaskId === task.id ? 'var(--color-primary-subtle)' : 'var(--color-bg-secondary)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: 'var(--font-size-sm)' }}>
                      <Clock size={12} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} aria-hidden="true" />
                      {tmpl?.name ?? task.templateId}
                    </strong>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      {task.cronExpression}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <Badge variant={task.enabled ? 'success' : 'neutral'}>
                      {task.enabled ? '활성' : '비활성'}
                    </Badge>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(task) }}
                      title={task.enabled ? '비활성화' : '활성화'}
                      aria-label={task.enabled ? '비활성화' : '활성화'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}
                    >
                      {task.enabled ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); executeNowMutation.mutate(task.id) }}
                      title="즉시 실행"
                      aria-label="즉시 실행"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 4 }}
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(task.id) }}
                      title="삭제"
                      aria-label="삭제"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: 4 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                  마지막 실행: {formatTime(task.lastRunAt)}
                </div>
              </article>
            )
          })}
        </section>

        {/* 실행 이력 */}
        <section>
          <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
            실행 이력
            {selectedTaskId && (
              <span style={{ marginLeft: 8 }}>
                <Badge variant="neutral">{logs.length}건</Badge>
              </span>
            )}
          </h4>
          {logs.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              실행 이력이 없어요.
            </div>
          )}
          {logs.map((log) => (
            <div
              key={log.id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)', marginBottom: 4,
                background: 'var(--color-bg-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {statusIcon(log.status)}
                <span style={{ fontSize: 'var(--font-size-xs)' }}>{formatTime(log.startedAt)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge variant={
                  log.status === 'success' ? 'success' :
                  log.status === 'failed' ? 'warning' : 'neutral'
                }>
                  {log.status}
                </Badge>
                {log.errorMessage && (
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.errorMessage}
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
