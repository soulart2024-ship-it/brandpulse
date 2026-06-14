import { Zap, LayoutDashboard, Brain, Image, TrendingUp,
         Palette, Video, Calendar, ChevronLeft, Menu, Plus, Trash2, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import './Sidebar.css'

const NAV = [
  { id: 'dashboard', label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'brand',     label: 'Brand Brain',    icon: Brain },
  { id: 'assets',   label: 'Asset Library',  icon: Image },
  { id: 'trends',   label: 'Trend Finder',   icon: TrendingUp },
  { id: 'studio',   label: 'Post Studio',    icon: Palette },
  { id: 'video',    label: 'Video Hub',      icon: Video },
  { id: 'calendar', label: 'Calendar',       icon: Calendar },
]

export default function Sidebar({ current, onNavigate, open, onToggle, brand, brands, activeBrandId, onSwitchBrand, onAddBrand, onDeleteBrand }) {
  const [brandsOpen, setBrandsOpen] = useState(false)
  const brandList = Object.entries(brands || {})

  return (
    <aside className={`sidebar ${open ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        {open && (
          <div className="sidebar-logo">
            <Zap size={20} className="logo-icon" />
            <span>BrandPulse</span>
          </div>
        )}
        <button className="toggle-btn" onClick={onToggle}>
          {open ? <ChevronLeft size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="brand-switcher">
          <button className="brand-switcher-btn" onClick={() => setBrandsOpen(o => !o)}>
            <span className="brand-dot" />
            <span className="brand-switcher-name">{brand?.name ?? 'Select Brand'}</span>
            <ChevronDown size={14} className={`chevron ${brandsOpen ? 'open' : ''}`} />
          </button>
          {brandsOpen && (
            <div className="brand-dropdown">
              {brandList.length === 0 && <p className="brand-empty">No brands yet</p>}
              {brandList.map(([id, b]) => (
                <div key={id} className={`brand-option ${id === activeBrandId ? 'active' : ''}`}>
                  <button className="brand-option-name" onClick={() => { onSwitchBrand(id); setBrandsOpen(false) }}>
                    <span className="brand-dot-sm" />{b.name || 'Unnamed'}
                  </button>
                  <button className="brand-delete" onClick={() => onDeleteBrand(id)}><Trash2 size={11} /></button>
                </div>
              ))}
              <button className="brand-add-btn" onClick={() => { onAddBrand(); setBrandsOpen(false) }}>
                <Plus size={13} /> Add New Brand
              </button>
            </div>
          )}
        </div>
      )}

      <nav className="sidebar-nav">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-item ${current === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)} title={!open ? label : undefined}>
            <Icon size={18} />
            {open && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {open && (
        <div className="sidebar-footer">
          <div className="sidebar-version">BrandPulse v1.1</div>
        </div>
      )}
    </aside>
  )
}
