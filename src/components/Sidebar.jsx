import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GitBranch,
  Users,
  Package,
  Megaphone,
  X,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/pipelines', label: 'Pipelines', icon: GitBranch },
  { path: '/vendedores', label: 'Vendedores', icon: Users },
  { path: '/produtos', label: 'Produtos', icon: Package },
  { path: '/marketing', label: 'Marketing', icon: Megaphone },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-bg-card border-r border-border
          flex flex-col transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div className="leading-tight">
              <span className="text-primary-light font-bold text-base tracking-wide">
                TALENTUS
              </span>
              <br />
              <span className="text-text-muted text-xs tracking-widest uppercase">
                Digital
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-text-muted hover:text-text p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                ${
                  isActive
                    ? 'bg-primary/10 text-primary-light border-l-2 border-primary glow-primary'
                    : 'text-text-muted hover:text-text hover:bg-bg-hover border-l-2 border-transparent'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <p className="text-xs text-text-dim">
            RevOps Dashboard v1.0
          </p>
          <p className="text-xs text-text-dim mt-0.5">
            Powered by Triadeflow
          </p>
        </div>
      </aside>
    </>
  );
}
