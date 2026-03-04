const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export interface KnowledgeItem {
  id: string
  title: string
  category: string
  tcode: string | null
  program_name?: string | null
  source_type?: string
  content?: string
  steps?: string[]
  warnings?: string[]
  tags?: string[]
  sap_note?: string | null
  error_code?: string | null
  solutions?: string[]
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface Statistics {
  total_queries: number
  total_knowledge_items: number
  categories: Record<string, number>
  top_tcodes: Array<{ tcode: string; count: number }>
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    })

    if (response.status === 401) {
      localStorage.removeItem('auth_token')
    }

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error')
      throw new Error(`API Error: ${response.status} - ${error}`)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json() as Promise<T>
  }

  // Statistics
  async getStats(): Promise<Statistics> {
    return this.request<Statistics>('/stats')
  }

  // Knowledge
  async getKnowledge(
    category?: string,
    sourceType?: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResponse<KnowledgeItem>> {
    const params = new URLSearchParams()
    if (category) params.append('category', category)
    if (sourceType) params.append('source_type', sourceType)
    params.append('page', String(page))
    params.append('page_size', String(pageSize))
    const query = params.toString()
    return this.request<PaginatedResponse<KnowledgeItem>>(
      `/knowledge${query ? `?${query}` : ''}`
    )
  }

  async getKnowledgeById(id: string): Promise<KnowledgeItem> {
    return this.request<KnowledgeItem>(`/knowledge/${id}`)
  }

  async createKnowledge(data: {
    title: string
    category: string
    tcode?: string
    content?: string
  }): Promise<KnowledgeItem> {
    return this.request<KnowledgeItem>('/knowledge', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateKnowledge(
    id: string,
    data: {
      title?: string
      category?: string
      tcode?: string
      content?: string
    }
  ): Promise<KnowledgeItem> {
    return this.request<KnowledgeItem>(`/knowledge/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteKnowledge(id: string): Promise<void> {
    return this.request<void>(`/knowledge/${id}`, {
      method: 'DELETE',
    })
  }

  // Health
  async getHealth(): Promise<{ status: string; version: string }> {
    return this.request('/health')
  }
}

export const apiClient = new ApiClient()
