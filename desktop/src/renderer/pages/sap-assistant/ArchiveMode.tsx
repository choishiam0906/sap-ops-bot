import { useCallback, useEffect, useState } from 'react'
import {
  Folder, FolderOpen, File, ChevronRight, ChevronDown,
  Plus, ClipboardPaste, FolderSearch,
} from 'lucide-react'
import type { ArchiveTreeNode } from '../../../main/contracts.js'
import { useArchiveStore } from '../../stores/archiveStore.js'
import { Button } from '../../components/ui/Button.js'
import './ArchiveMode.css'

const desktop = window.sapOpsDesktop

export function ArchiveMode() {
  const {
    archiveFolderPath, selectedFilePath, fileContent, isLoadingFile, error,
    treeExpanded,
    setArchiveFolderPath, setSelectedFilePath, setFileContent,
    setIsLoadingFile, setError, toggleTreeNode,
  } = useArchiveStore()

  const [tree, setTree] = useState<ArchiveTreeNode[]>([])
  const [isLoadingTree, setIsLoadingTree] = useState(false)
  const [showPasteDialog, setShowPasteDialog] = useState(false)
  const [pasteFileName, setPasteFileName] = useState('')
  const [pasteContent, setPasteContent] = useState('')

  // 폴더가 설정되면 트리 로드
  const loadTree = useCallback(async (folderPath: string) => {
    setIsLoadingTree(true)
    setError(null)
    try {
      const nodes = await desktop.archiveListContents({ folderPath, maxDepth: 3 })
      setTree(nodes)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '트리 로드에 실패했어요')
      setTree([])
    } finally {
      setIsLoadingTree(false)
    }
  }, [setError])

  useEffect(() => {
    if (archiveFolderPath) {
      loadTree(archiveFolderPath)
    }
  }, [archiveFolderPath, loadTree])

  async function handlePickFolder() {
    const result = await desktop.archivePickFolder()
    if (!result.canceled && result.path) {
      setArchiveFolderPath(result.path)
    }
  }

  async function handleFileClick(node: ArchiveTreeNode) {
    if (node.type !== 'file') return
    setSelectedFilePath(node.path)
    setIsLoadingFile(true)
    setError(null)
    try {
      const result = await desktop.archiveReadFile({ filePath: node.path })
      setFileContent(result.content)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '파일 읽기에 실패했어요')
      setFileContent(null)
    } finally {
      setIsLoadingFile(false)
    }
  }

  async function handlePasteSave() {
    if (!archiveFolderPath || !pasteFileName.trim() || !pasteContent.trim()) return
    const filePath = `${archiveFolderPath}/${pasteFileName.trim()}`
    const result = await desktop.archiveSaveFile({ filePath, content: pasteContent })
    if (result.success) {
      setShowPasteDialog(false)
      setPasteFileName('')
      setPasteContent('')
      loadTree(archiveFolderPath)
    } else {
      setError(result.error ?? '저장에 실패했어요')
    }
  }

  function getSelectedFileName(): string | null {
    if (!selectedFilePath) return null
    const parts = selectedFilePath.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] ?? null
  }

  // 빈 상태: 폴더 미선택
  if (!archiveFolderPath) {
    return (
      <div className="archive-mode">
        <div className="archive-empty">
          <FolderSearch size={48} className="archive-empty-icon" aria-hidden="true" />
          <p className="archive-empty-title">소스코드 아카이브</p>
          <p className="archive-empty-desc">
            SAP CBO 소스코드를 저장하고 탐색할 수 있어요.<br />
            아카이브 폴더를 선택해 주세요.
          </p>
          <Button variant="primary" onClick={handlePickFolder}>
            <Folder size={16} aria-hidden="true" />
            폴더 선택
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="archive-mode">
      {/* 헤더 */}
      <div className="archive-header">
        <div className="archive-header-path">
          <Folder size={16} aria-hidden="true" />
          <span className="archive-path-text" title={archiveFolderPath}>
            {archiveFolderPath}
          </span>
        </div>
        <div className="archive-header-actions">
          <Button variant="ghost" size="sm" onClick={handlePickFolder}>
            폴더 변경
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowPasteDialog(true)}>
            <ClipboardPaste size={14} aria-hidden="true" />
            붙여넣기로 저장
          </Button>
        </div>
      </div>

      {error && (
        <div className="archive-error">{error}</div>
      )}

      {/* 붙여넣기 다이얼로그 */}
      {showPasteDialog && (
        <div className="archive-paste-dialog">
          <div className="archive-paste-header">
            <strong>텍스트를 파일로 저장</strong>
            <button className="archive-paste-close" onClick={() => setShowPasteDialog(false)}>×</button>
          </div>
          <input
            className="archive-paste-input"
            type="text"
            placeholder="파일명 (예: Z_REPORT_001.txt)"
            value={pasteFileName}
            onChange={(e) => setPasteFileName(e.target.value)}
          />
          <textarea
            className="archive-paste-textarea"
            placeholder="소스코드를 여기에 붙여넣어 주세요..."
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            rows={10}
          />
          <div className="archive-paste-actions">
            <Button variant="ghost" size="sm" onClick={() => setShowPasteDialog(false)}>
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePasteSave}
              disabled={!pasteFileName.trim() || !pasteContent.trim()}
            >
              <Plus size={14} aria-hidden="true" />
              저장
            </Button>
          </div>
        </div>
      )}

      {/* 메인 컨텐츠: 트리 + 뷰어 */}
      <div className="archive-container">
        {/* 트리 패널 */}
        <div className="archive-tree">
          {isLoadingTree && <div className="archive-tree-loading">불러오는 중...</div>}
          {!isLoadingTree && tree.length === 0 && (
            <div className="archive-tree-empty">텍스트 파일이 없어요</div>
          )}
          {!isLoadingTree && tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              selectedPath={selectedFilePath}
              expanded={treeExpanded}
              onToggle={toggleTreeNode}
              onFileClick={handleFileClick}
            />
          ))}
        </div>

        {/* 코드 뷰어 */}
        <div className="archive-viewer">
          {isLoadingFile && <div className="archive-viewer-loading">파일을 읽는 중...</div>}
          {!isLoadingFile && !fileContent && !selectedFilePath && (
            <div className="archive-viewer-empty">
              <File size={32} className="archive-empty-icon" aria-hidden="true" />
              <p>왼쪽 트리에서 파일을 선택해 주세요</p>
            </div>
          )}
          {!isLoadingFile && fileContent !== null && (
            <div className="archive-viewer-content">
              <div className="archive-viewer-filename">{getSelectedFileName()}</div>
              <pre className="archive-code">{fileContent}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 트리 노드 ───

interface TreeNodeProps {
  node: ArchiveTreeNode
  depth: number
  selectedPath: string | null
  expanded: Record<string, boolean>
  onToggle: (path: string) => void
  onFileClick: (node: ArchiveTreeNode) => void
}

function TreeNode({ node, depth, selectedPath, expanded, onToggle, onFileClick }: TreeNodeProps) {
  const isExpanded = expanded[node.path] ?? (depth < 1)
  const isSelected = selectedPath === node.path
  const indent = depth * 16

  if (node.type === 'folder') {
    return (
      <>
        <button
          className="tree-node tree-node-folder"
          style={{ paddingLeft: `${indent + 8}px` }}
          onClick={() => onToggle(node.path)}
          aria-expanded={isExpanded}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
          <span className="tree-node-name">{node.name}</span>
        </button>
        {isExpanded && node.children?.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            expanded={expanded}
            onToggle={onToggle}
            onFileClick={onFileClick}
          />
        ))}
      </>
    )
  }

  return (
    <button
      className={`tree-node tree-node-file ${isSelected ? 'selected' : ''}`}
      style={{ paddingLeft: `${indent + 22}px` }}
      onClick={() => onFileClick(node)}
    >
      <File size={14} />
      <span className="tree-node-name">{node.name}</span>
    </button>
  )
}
