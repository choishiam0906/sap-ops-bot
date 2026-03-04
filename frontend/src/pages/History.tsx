import { useEffect, useState } from 'react'
import { apiClient, type KnowledgeItem } from '../api/client'
import './History.css'

export const History: React.FC = () => {
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await apiClient.getKnowledge(undefined, undefined, 1, 50)
        setItems(data.items)
      } catch (err) {
        setError(err instanceof Error ? err.message : '이력을 불러올 수 없어요')
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  if (loading) return <div className="loading">로딩 중...</div>
  if (error) return <div className="error-message">{error}</div>

  return (
    <div className="history">
      <h2 className="page-title">활동 이력</h2>
      <p className="history-subtitle">최근 등록 및 수정된 지식 항목이에요</p>

      {items.length === 0 ? (
        <div className="empty-state">아직 등록된 지식이 없어요</div>
      ) : (
        <div className="history-layout">
          <div className="history-timeline">
            {items.map((item) => (
              <button
                key={item.id}
                className={`timeline-item ${selectedItem?.id === item.id ? 'active' : ''}`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <span className="timeline-title">{item.title}</span>
                  <div className="timeline-meta">
                    <span className="timeline-category">{item.category}</span>
                    {item.tcode && <span className="timeline-tcode">{item.tcode}</span>}
                    <span className="timeline-date">
                      {new Date(item.updated_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="history-detail">
            {selectedItem ? (
              <div className="detail-card">
                <h3 className="detail-title">{selectedItem.title}</h3>
                <div className="detail-badges">
                  <span className="detail-badge category">{selectedItem.category}</span>
                  {selectedItem.tcode && (
                    <span className="detail-badge tcode">{selectedItem.tcode}</span>
                  )}
                  {selectedItem.source_type && selectedItem.source_type !== 'guide' && (
                    <span className="detail-badge source">{selectedItem.source_type}</span>
                  )}
                </div>
                {selectedItem.content && (
                  <p className="detail-content">{selectedItem.content}</p>
                )}
                {selectedItem.steps && selectedItem.steps.length > 0 && (
                  <div className="detail-section">
                    <h4>실행 절차</h4>
                    <ol>
                      {selectedItem.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {selectedItem.warnings && selectedItem.warnings.length > 0 && (
                  <div className="detail-section warnings">
                    <h4>주의사항</h4>
                    <ul>
                      {selectedItem.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="detail-footer">
                  <span>수정일: {new Date(selectedItem.updated_at).toLocaleString('ko-KR')}</span>
                  <span>생성일: {new Date(selectedItem.created_at).toLocaleString('ko-KR')}</span>
                </div>
              </div>
            ) : (
              <div className="detail-placeholder">
                항목을 선택하면 상세 내용을 확인할 수 있어요
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
