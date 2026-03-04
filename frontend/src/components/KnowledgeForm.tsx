import { useState, useEffect } from 'react'
import { KnowledgeItem } from '../api/client'
import './KnowledgeForm.css'

interface KnowledgeFormProps {
  isOpen: boolean
  item?: KnowledgeItem
  categories: string[]
  onClose: () => void
  onSubmit: (data: {
    title: string
    category: string
    tcode: string
    content?: string
  }) => Promise<void>
  isLoading?: boolean
}

export const KnowledgeForm: React.FC<KnowledgeFormProps> = ({
  isOpen,
  item,
  categories,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    tcode: '',
    content: '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title,
        category: item.category,
        tcode: item.tcode || '',
        content: item.content || '',
      })
    } else {
      setFormData({
        title: '',
        category: '',
        tcode: '',
        content: '',
      })
    }
    setError(null)
  }, [item, isOpen])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError('제목을 입력해주세요.')
      return
    }

    if (!formData.category.trim()) {
      setError('카테고리를 선택해주세요.')
      return
    }

    try {
      await onSubmit(formData)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했어요.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{item ? '지식 수정' : '지식 추가'}</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="닫기"
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="knowledge-form">
          <div className="form-group">
            <label htmlFor="title">제목</label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="지식 제목"
              disabled={isLoading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">카테고리</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                disabled={isLoading}
              >
                <option value="">선택해주세요</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tcode">T-code</label>
              <input
                id="tcode"
                type="text"
                name="tcode"
                value={formData.tcode}
                onChange={handleChange}
                placeholder="예) FI01"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="content">내용</label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="지식 내용 (선택사항)"
              rows={6}
              disabled={isLoading}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              취소
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? '저장 중...' : item ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
