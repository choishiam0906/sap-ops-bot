import { useEffect, useState } from 'react'
import { apiClient, type Statistics, type FeedbackStats } from '../api/client'
import './Dashboard.css'

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, feedbackData] = await Promise.all([
          apiClient.getStats(),
          apiClient.getFeedbackStats().catch(() => null),
        ])
        setStats(statsData)
        setFeedbackStats(feedbackData)
      } catch (err) {
        setError(err instanceof Error ? err.message : '통계를 불러올 수 없어요')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div className="loading">로딩 중...</div>
  if (error) return <div className="error-message">{error}</div>
  if (!stats) return null

  const categoryCount = Object.keys(stats.categories).length
  const satisfactionPercent = feedbackStats
    ? Math.round(feedbackStats.satisfaction_rate * 100)
    : null

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
        {feedbackStats && (
          <div className="stat-card">
            <span className="stat-label">응답 만족도</span>
            <span className="stat-value">{satisfactionPercent}%</span>
          </div>
        )}
      </div>

      {stats.token_usage && (
        <div className="section">
          <h3 className="section-title">LLM 토큰 사용량</h3>
          <div className="stats-grid">
            <div className="stat-card stat-card-small">
              <span className="stat-label">총 토큰</span>
              <span className="stat-value">{stats.token_usage.total_tokens.toLocaleString()}</span>
            </div>
            <div className="stat-card stat-card-small">
              <span className="stat-label">요청 수</span>
              <span className="stat-value">{stats.token_usage.request_count.toLocaleString()}</span>
            </div>
            <div className="stat-card stat-card-small">
              <span className="stat-label">프롬프트 토큰</span>
              <span className="stat-value">{stats.token_usage.total_prompt_tokens.toLocaleString()}</span>
            </div>
            <div className="stat-card stat-card-small">
              <span className="stat-label">완성 토큰</span>
              <span className="stat-value">{stats.token_usage.total_completion_tokens.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {feedbackStats && feedbackStats.total_feedbacks > 0 && (
        <div className="section">
          <h3 className="section-title">피드백 통계</h3>
          <div className="stats-grid">
            <div className="stat-card stat-card-small">
              <span className="stat-label">총 피드백</span>
              <span className="stat-value">{feedbackStats.total_feedbacks}</span>
            </div>
            <div className="stat-card stat-card-small">
              <span className="stat-label">긍정</span>
              <span className="stat-value stat-positive">{feedbackStats.positive_count}</span>
            </div>
            <div className="stat-card stat-card-small">
              <span className="stat-label">부정</span>
              <span className="stat-value stat-negative">{feedbackStats.negative_count}</span>
            </div>
          </div>

          {feedbackStats.recent_daily.length > 0 && (
            <div className="feedback-chart">
              <h4 className="subsection-title">최근 7일 추이</h4>
              <div className="daily-bars">
                {feedbackStats.recent_daily.map((day) => {
                  const maxCount = Math.max(
                    ...feedbackStats.recent_daily.map((d) => d.count),
                    1
                  )
                  const barHeight = (day.count / maxCount) * 100
                  const positiveRatio = day.count > 0 ? (day.positive / day.count) * 100 : 0
                  return (
                    <div key={day.date} className="daily-bar-col">
                      <div className="daily-bar-track" style={{ height: '120px' }}>
                        <div
                          className="daily-bar-fill"
                          style={{ height: `${barHeight}%` }}
                          title={`${day.date}: ${day.positive}긍정 / ${day.negative}부정`}
                        >
                          <div
                            className="daily-bar-positive"
                            style={{ height: `${positiveRatio}%` }}
                          />
                        </div>
                      </div>
                      <span className="daily-bar-label">
                        {day.date.slice(5)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

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
