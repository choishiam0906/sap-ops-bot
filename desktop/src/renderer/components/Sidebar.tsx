import { useState } from 'react'
import { MessageSquare, Search, LayoutDashboard, Database, Settings, PanelLeftClose, PanelLeft, FolderSearch, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AppPage } from '../stores/appShellStore'
import './Sidebar.css'

interface SidebarProps {
  currentPage: AppPage
  onNavigate: (page: AppPage) => void
}

const NAV_ITEMS: { page: AppPage; label: string; Icon: LucideIcon }[] = [
  { page: 'audit', label: 'SAP Cockpit', Icon: LayoutDashboard },
  { page: 'chat', label: 'Case Assistant', Icon: MessageSquare },
  { page: 'cbo', label: 'Impact Analysis', Icon: Search },
  { page: 'sources', label: 'Sources', Icon: FolderSearch },
  { page: 'skills', label: 'Skills', Icon: Sparkles },
  { page: 'vault', label: 'Vault', Icon: Database },
  { page: 'settings', label: 'Settings', Icon: Settings },
]

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-brand">
            <h1 className="sidebar-title">SAP Assistant</h1>
            <span className="sidebar-version">Desktop Platform v3.0</span>
          </div>
        )}
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
      <nav className="sidebar-nav" aria-label="메인 내비게이션">
        {NAV_ITEMS.map(({ page, label, Icon }) => (
          <button
            key={page}
            className={`nav-item ${currentPage === page ? 'active' : ''}`}
            onClick={() => onNavigate(page)}
            aria-current={currentPage === page ? 'page' : undefined}
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="nav-icon" aria-hidden="true" />
            {!collapsed && <span className="nav-label">{label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  )
}
