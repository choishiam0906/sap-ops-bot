import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ChatUILayoutState {
  skillsCollapsed: boolean
  sourcesCollapsed: boolean
  toggleSkillsCollapsed: () => void
  toggleSourcesCollapsed: () => void
}

export const useChatUIStore = create<ChatUILayoutState>()(
  persist(
    (set) => ({
      skillsCollapsed: false,
      sourcesCollapsed: false,
      toggleSkillsCollapsed: () =>
        set((s) => ({ skillsCollapsed: !s.skillsCollapsed })),
      toggleSourcesCollapsed: () =>
        set((s) => ({ sourcesCollapsed: !s.sourcesCollapsed })),
    }),
    { name: 'sap-chat-ui-layout' }
  )
)
