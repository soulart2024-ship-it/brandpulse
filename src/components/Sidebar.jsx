import { Zap, LayoutDashboard, Brain, Image, TrendingUp, PenTool,
         Palette, Film, BookOpen, Video, Calendar, ChevronLeft, ChevronRight, Menu } from 'lucide-react'
import './Sidebar.css'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'brand',     label: 'Brand Brain', icon: Brain },
  { id: 'assets',   label: 'Asset Library', icon: Image },
  { id: 'trends',   label: 'Trend Finder', icon: TrendingUp },
  { id: 'content',  label: 'Content Generator', icon: PenTool },
  { id: 'images',   label: 'AI Image Studio', icon: Palette },
  { id: 'motion',   label: 'Motion Cards', icon: Film },
  { id: 'storyboard', label: 'Storyboard', icon: BookOpen },
  { id: 'video',    label: 'Video Hub', icon: Video },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
]

export default function Sidebar({ current, onNavigate, open, onToggle, brand }) {
  return (
    <aside className={`sidebar ${open ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        {open && (
          <div className="sidebar-logo">
            <Zap size={20} className="logo-icon" />
            <span>BrandPulse</span>
          </div>
        )}
        <button className="toggle-btn" onClick={onToggle} aria-label="Toggle sidebar">
          {open ? <ChevronLeft size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && brand && (
        <div className="sidebar-brand-pill">
          <span className="brand-dot" />
          <span>{brand.name}</span>
        </div>
      )}

      <nav className="sidebar-nav">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${current === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
            title={!open ? label : undefined}
          >
            <Icon size={18} />
            {open && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {open && (
        <div className="sidebar-footer">
          <div className="sidebar-version">BrandPulse v1.0</div>
        </div>
      )}
    </aside>
  )
}
