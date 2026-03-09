import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from '../chatStore'
import { DEFAULT_MODELS } from '../../../main/contracts'

function resetStore() {
  useChatStore.setState({
    currentSessionId: null,
    input: '',
    provider: 'openai',
    model: DEFAULT_MODELS.openai,
    error: '',
    isStreaming: false,
    streamingContent: '',
    selectedSkillId: '',
    selectedSourceIds: [],
    caseContext: null,
    lastExecutionMeta: null,
    streamingMeta: null,
  })
}

describe('chatStore', () => {
  beforeEach(resetStore)

  describe('기본 setter', () => {
    it('setInput으로 입력값을 설정한다', () => {
      useChatStore.getState().setInput('안녕하세요')
      expect(useChatStore.getState().input).toBe('안녕하세요')
    })

    it('setCurrentSessionId로 세션 ID를 설정한다', () => {
      useChatStore.getState().setCurrentSessionId('session-123')
      expect(useChatStore.getState().currentSessionId).toBe('session-123')
    })

    it('setModel로 모델을 설정한다', () => {
      useChatStore.getState().setModel('gpt-4.1-mini')
      expect(useChatStore.getState().model).toBe('gpt-4.1-mini')
    })

    it('setError / clearError로 에러를 관리한다', () => {
      useChatStore.getState().setError('네트워크 오류')
      expect(useChatStore.getState().error).toBe('네트워크 오류')

      useChatStore.getState().clearError()
      expect(useChatStore.getState().error).toBe('')
    })
  })

  describe('setProvider', () => {
    it('provider 변경 시 해당 provider의 기본 모델로 자동 설정된다', () => {
      useChatStore.getState().setProvider('anthropic')
      expect(useChatStore.getState().provider).toBe('anthropic')
      expect(useChatStore.getState().model).toBe(DEFAULT_MODELS.anthropic)
    })

    it('google provider로 전환하면 google 기본 모델이 된다', () => {
      useChatStore.getState().setProvider('google')
      expect(useChatStore.getState().provider).toBe('google')
      expect(useChatStore.getState().model).toBe(DEFAULT_MODELS.google)
    })

    it('openai로 돌아오면 openai 기본 모델이 된다', () => {
      useChatStore.getState().setProvider('anthropic')
      useChatStore.getState().setProvider('openai')
      expect(useChatStore.getState().model).toBe(DEFAULT_MODELS.openai)
    })
  })

  describe('toggleSourceId', () => {
    it('없는 ID를 토글하면 추가된다', () => {
      useChatStore.getState().toggleSourceId('src1')
      expect(useChatStore.getState().selectedSourceIds).toEqual(['src1'])
    })

    it('있는 ID를 토글하면 제거된다', () => {
      useChatStore.setState({ selectedSourceIds: ['src1', 'src2'] })
      useChatStore.getState().toggleSourceId('src1')
      expect(useChatStore.getState().selectedSourceIds).toEqual(['src2'])
    })

    it('연속 토글로 추가/제거를 반복할 수 있다', () => {
      useChatStore.getState().toggleSourceId('src1')
      useChatStore.getState().toggleSourceId('src2')
      expect(useChatStore.getState().selectedSourceIds).toEqual(['src1', 'src2'])

      useChatStore.getState().toggleSourceId('src1')
      expect(useChatStore.getState().selectedSourceIds).toEqual(['src2'])
    })

    it('빈 배열에서 토글해도 정상 동작한다', () => {
      useChatStore.setState({ selectedSourceIds: [] })
      useChatStore.getState().toggleSourceId('new-src')
      expect(useChatStore.getState().selectedSourceIds).toEqual(['new-src'])
    })
  })

  describe('streaming', () => {
    it('appendStreamingContent로 토큰을 누적한다', () => {
      useChatStore.getState().appendStreamingContent('Hello')
      useChatStore.getState().appendStreamingContent(' world')
      expect(useChatStore.getState().streamingContent).toBe('Hello world')
    })

    it('setStreamingMeta로 메타데이터를 설정한다', () => {
      const meta = {
        sources: [{ title: 'Test', category: 'vault', relevance_score: 0.9 }],
        suggested_tcodes: ['SE80'],
        skill_used: 'cbo-impact-analysis',
      }
      useChatStore.getState().setStreamingMeta(meta)
      expect(useChatStore.getState().streamingMeta).toEqual(meta)
    })

    it('resetStreaming으로 스트리밍 상태를 초기화한다', () => {
      useChatStore.setState({
        isStreaming: true,
        streamingContent: '진행 중...',
        streamingMeta: {
          sources: [],
          suggested_tcodes: [],
          skill_used: 'test',
        },
      })

      useChatStore.getState().resetStreaming()

      expect(useChatStore.getState().isStreaming).toBe(false)
      expect(useChatStore.getState().streamingContent).toBe('')
      expect(useChatStore.getState().streamingMeta).toBeNull()
    })
  })
})
