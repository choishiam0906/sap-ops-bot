import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ArchiveState {
  archiveFolderPath: string | null
  selectedFilePath: string | null
  fileContent: string | null
  isLoadingFile: boolean
  error: string | null
  treeExpanded: Record<string, boolean>

  setArchiveFolderPath: (path: string | null) => void
  setSelectedFilePath: (path: string | null) => void
  setFileContent: (content: string | null) => void
  setIsLoadingFile: (v: boolean) => void
  setError: (error: string | null) => void
  toggleTreeNode: (nodePath: string) => void
}

export const useArchiveStore = create<ArchiveState>()(
  persist(
    (set) => ({
      archiveFolderPath: null,
      selectedFilePath: null,
      fileContent: null,
      isLoadingFile: false,
      error: null,
      treeExpanded: {},

      setArchiveFolderPath: (archiveFolderPath) =>
        set({ archiveFolderPath, selectedFilePath: null, fileContent: null, error: null }),
      setSelectedFilePath: (selectedFilePath) => set({ selectedFilePath }),
      setFileContent: (fileContent) => set({ fileContent }),
      setIsLoadingFile: (isLoadingFile) => set({ isLoadingFile }),
      setError: (error) => set({ error }),
      toggleTreeNode: (nodePath) =>
        set((s) => ({
          treeExpanded: {
            ...s.treeExpanded,
            [nodePath]: !s.treeExpanded[nodePath],
          },
        })),
    }),
    {
      name: 'sap-archive-store',
      partialize: (state) => ({ archiveFolderPath: state.archiveFolderPath }),
    },
  ),
)
