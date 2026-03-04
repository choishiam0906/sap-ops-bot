import { useEffect, useState } from 'react'
import { apiClient, type Statistics } from '../api/client'
import './Dashboard.css'

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiClient.getStats()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '통계를 불러올 수 없어요')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) return <div className="loading">로딩 중...</div>
  if (error) return <div className="error-message">{error}</div>
  if (!stats) return null

  const categoryCount = Object.keys(stats.categories).length

  return (
    <div className="dashboard">
      <h2 className="page-title">대시보드</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">총 질의 수</span>
          <span className="stat-value">{stats.total_queries.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">지식 항목</span>
          <span className="stat-value">{stats.total_knowledge_items.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">카테고리</span>
          <span className="stat-value">{categoryCount}</span>
        </div>
      </div>

      {Object.keys(stats.categories).length > 0 && (
        <div className="category-section">
          <h3 className="section-title">카테고리별 분포</h3>
          <div className="category-bars">
            {Object.entries(stats.categories).map(([category, count]) => {
              const maxCount = Math.max(...Object.values(stats.categories))
              const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0
              return (
                <div key={category} className="category-bar-row">
                  <span className="category-label">{category}</span>
                  <div className="category-bar-track">
                    <div
                      className="category-bar-fill"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  <span className="category-count">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
