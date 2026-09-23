import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderSearch,
  Network,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  Settings
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const NAV_ITEMS = [
  { to: '/',               label: 'Dashboard',      Icon: LayoutDashboard, exact: true  },
  { to: '/investigations', label: 'Investigations',  Icon: FolderSearch,    exact: false },
  { to: '/intelligence',   label: 'Intelligence',    Icon: BrainCircuit,    exact: false },
  { to: '/settings',       label: 'Settings',        Icon: Settings,        exact: false },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  function isActive(to: string, exact: boolean) {
    return exact ? location.pathname === to : location.pathname.startsWith(to);
  }

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon" aria-hidden="true">
          <Network size={18} />
        </div>
        <span className="sidebar__logo-text">TraceX</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, label, Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            className={`nav-item ${isActive(to, exact) ? 'nav-item--active' : ''}`}
            title={collapsed ? label : undefined}
          >
            <span className="nav-item__icon">
              <Icon size={18} />
            </span>
            <span className="nav-item__label">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="sidebar__toggle">
        <button
          className="sidebar__toggle-btn"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          <span className="sidebar__toggle-label">Collapse</span>
        </button>
      </div>
    </aside>
  );
}
