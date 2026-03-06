import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import './Login.css'

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return

    setLoading(true)
    setError('')
    try {
      const data = await apiClient.login(username, password)
      localStorage.setItem('auth_token', data.access_token)
      navigate('/')
    } catch {
      setError('사용자명 또는 비밀번호가 올바르지 않아요')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">SAP Ops Bot</h1>
        <p className="login-subtitle">관리자 로그인</p>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error" role="alert">{error}</div>}

          <div className="login-field">
            <label htmlFor="username">사용자명</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="사용자명을 입력하세요"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
